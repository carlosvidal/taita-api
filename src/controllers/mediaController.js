import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import cloudinaryService from "../services/cloudinary.js";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Obtener __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Función para generar un nombre de archivo único
const generateUniqueFilename = (originalname) => {
  const baseName = path.parse(originalname).name.replace(/[^a-zA-Z0-9]/g, '-');
  const timestamp = Date.now();
  const uniqueId = uuidv4().substring(0, 8);
  return `${baseName}-${timestamp}-${uniqueId}`;
};

/**
 * Sube una imagen usando Cloudinary o almacenamiento local (fallback)
 */
const uploadImage = async (req, res) => {
  try {
    console.log('Request files:', req.files);
    console.log('Request file:', req.file);
    console.log('Request body:', req.body);
    
    // Verificar si la imagen viene como req.file (multer single)
    if (!req.file) {
      return res.status(400).json({ 
        error: "No se proporcionó ninguna imagen", 
        details: "El archivo de imagen no fue recibido correctamente",
        received: { files: req.files, file: req.file, body: req.body }
      });
    }
    
    // Usar req.file ya que estamos usando upload.single
    const { buffer, originalname, mimetype } = req.file;
    console.log('Archivo recibido:', { originalname, mimetype, size: buffer?.length || 0 });

    // Extraer información de la solicitud
    const { entityType = 'general', entityId } = req.body;
    
    // Validar tipo de imagen
    if (!mimetype.startsWith('image/')) {
      return res.status(400).json({ 
        error: "El archivo debe ser una imagen válida" 
      });
    }

    // Obtener información del blog desde la autenticación
    console.log('req.user:', req.user);
    console.log('req.body:', req.body);
    
    const blogId = req.user?.blogId || req.body.blogId;
    console.log('blogId extraído:', blogId);
    
    if (!blogId) {
      return res.status(400).json({ 
        error: "Blog ID es requerido",
        debug: {
          userBlogId: req.user?.blogId,
          bodyBlogId: req.body.blogId,
          user: req.user
        }
      });
    }

    let uploadResult;
    let finalPath;
    let variants = {};

    // Intentar usar Cloudinary primero
    console.log('Verificando configuración de Cloudinary...');
    const isCloudinaryConfigured = cloudinaryService.isConfigured();
    console.log('Cloudinary configurado:', isCloudinaryConfigured);
    console.log('Variables de entorno:', {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
    });
    
    if (isCloudinaryConfigured) {
      try {
        console.log('Subiendo a Cloudinary...');
        
        // Generar un public ID único
        const uniqueId = generateUniqueFilename(originalname);
        console.log('Public ID generado:', uniqueId);
        
        uploadResult = await cloudinaryService.uploadImage(buffer, {
          folder: 'taita-blog',
          publicId: uniqueId,
          entityType,
          entityId
        });

        finalPath = uploadResult.url;
        variants = uploadResult.variants;
        
        console.log('Imagen subida a Cloudinary exitosamente:', {
          publicId: uploadResult.publicId,
          url: uploadResult.url,
          format: uploadResult.format,
          bytes: uploadResult.bytes
        });
        
      } catch (cloudinaryError) {
        console.error('Error al subir a Cloudinary:', {
          message: cloudinaryError.message,
          stack: cloudinaryError.stack,
          name: cloudinaryError.name
        });
        console.log('Fallando a almacenamiento local...');
        // Fallar a almacenamiento local si Cloudinary falla
        uploadResult = null;
      }
    } else {
      console.log('Cloudinary no configurado, usando almacenamiento local directamente...');
    }

    // Fallback a almacenamiento local si Cloudinary no está configurado o falla
    if (!uploadResult) {
      console.log('Usando almacenamiento local...');
      
      // Determinar la carpeta de destino
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      const entityDir = path.join(uploadsDir, entityType);
      
      // Crear directorio si no existe
      if (!fs.existsSync(entityDir)) {
        fs.mkdirSync(entityDir, { recursive: true });
      }

      // Generar nombre único del archivo
      const uniqueFilename = generateUniqueFilename(originalname);

      // Procesar imagen con Sharp
      const processedImage = await sharp(buffer)
        .resize(2000, 2000, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .webp({ quality: 90 })
        .toBuffer();

      // Guardar imagen principal
      const mainPath = path.join(entityDir, `${uniqueFilename}.webp`);
      await fs.promises.writeFile(mainPath, processedImage);

      // Crear variantes
      const mediumBuffer = await sharp(buffer)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      
      const smallBuffer = await sharp(buffer)
        .resize(400, 300, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const mediumPath = path.join(entityDir, `${uniqueFilename}_medium.webp`);
      const smallPath = path.join(entityDir, `${uniqueFilename}_small.webp`);

      await fs.promises.writeFile(mediumPath, mediumBuffer);
      await fs.promises.writeFile(smallPath, smallBuffer);

      // Construir rutas relativas
      finalPath = `/${entityType}/${uniqueFilename}.webp`;
      variants = {
        original: finalPath,
        medium: `/${entityType}/${uniqueFilename}_medium.webp`,
        small: `/${entityType}/${uniqueFilename}_small.webp`
      };

      uploadResult = {
        success: true,
        url: finalPath,
        publicId: null, // No hay public ID para almacenamiento local
        cloudinaryId: null,
        variants,
        local: true
      };
    }

    // Guardar información en la base de datos
    console.log('Datos para crear media:', {
      blogId: parseInt(blogId),
      blogIdType: typeof blogId,
      filename: path.basename(finalPath),
      entityType,
      cloudinaryId: uploadResult.cloudinaryId || null
    });
    
    const mediaRecord = await prisma.media.create({
      data: {
        uuid: uuidv4(),
        filename: path.basename(finalPath),
        originalName: originalname,
        mimeType: mimetype,
        path: finalPath,
        size: buffer.length,
        entityType,
        entityId: entityId || null,
        blogId: parseInt(blogId),
        variants: JSON.stringify(variants),
        // Campos específicos para Cloudinary
        cloudinaryId: uploadResult.cloudinaryId || null,
        cloudinaryUrl: uploadResult.url || null
      }
    });

    // Respuesta exitosa
    res.status(201).json({
      success: true,
      message: uploadResult.cloudinaryId ? 
        "Imagen subida exitosamente a Cloudinary" : 
        "Imagen subida exitosamente al almacenamiento local",
      media: {
        id: mediaRecord.id,
        uuid: mediaRecord.uuid,
        url: finalPath,
        variants,
        filename: mediaRecord.filename,
        originalName: mediaRecord.originalName,
        mimeType: mediaRecord.mimeType,
        size: mediaRecord.size,
        cloudinary: !!uploadResult.cloudinaryId,
        cloudinaryId: uploadResult.cloudinaryId
      }
    });

  } catch (error) {
    console.error('Error en uploadImage:', error);
    res.status(500).json({ 
      error: "Error interno del servidor al subir la imagen",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener lista de medios
 */
const getMedia = async (req, res) => {
  try {
    const { page = 1, limit = 20, entityType } = req.query;
    const blogId = req.user?.blogId;

    if (!blogId) {
      return res.status(400).json({ error: "Blog ID es requerido" });
    }

    const where = {
      blogId: parseInt(blogId),
      ...(entityType && { entityType })
    };

    const media = await prisma.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    // Procesar variants para asegurar que sea un objeto
    const processedMedia = media.map(item => ({
      ...item,
      variants: typeof item.variants === 'string' ? 
        JSON.parse(item.variants) : 
        item.variants || {},
      url: item.cloudinaryUrl || item.path // Priorizar URL de Cloudinary
    }));

    const total = await prisma.media.count({ where });

    res.json({
      success: true,
      data: processedMedia,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error en getMedia:', error);
    res.status(500).json({ 
      error: "Error interno del servidor al obtener medios" 
    });
  }
};

/**
 * Eliminar medio
 */
const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const blogId = req.user?.blogId;

    if (!blogId) {
      return res.status(400).json({ error: "Blog ID es requerido" });
    }

    // Buscar el medio
    const media = await prisma.media.findFirst({
      where: {
        id: parseInt(id),
        blogId: parseInt(blogId)
      }
    });

    if (!media) {
      return res.status(404).json({ error: "Medio no encontrado" });
    }

    // Eliminar de Cloudinary si existe
    if (media.cloudinaryId) {
      try {
        await cloudinaryService.deleteImage(media.cloudinaryId);
        console.log('Imagen eliminada de Cloudinary:', media.cloudinaryId);
      } catch (cloudinaryError) {
        console.error('Error al eliminar de Cloudinary:', cloudinaryError);
        // Continuar con la eliminación local aunque falle Cloudinary
      }
    }

    // Eliminar archivos locales si existen
    if (media.path && !media.cloudinaryId) {
      try {
        const uploadsDir = path.resolve(process.cwd(), 'uploads');
        const fullPath = path.join(uploadsDir, media.path);
        
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
        }

        // Eliminar variantes si existen
        const variants = typeof media.variants === 'string' ? 
          JSON.parse(media.variants) : 
          media.variants || {};
        
        for (const variantPath of Object.values(variants)) {
          if (typeof variantPath === 'string' && variantPath.startsWith('/')) {
            const variantFullPath = path.join(uploadsDir, variantPath);
            if (fs.existsSync(variantFullPath)) {
              await fs.promises.unlink(variantFullPath);
            }
          }
        }
      } catch (fileError) {
        console.error('Error al eliminar archivos locales:', fileError);
      }
    }

    // Eliminar registro de la base de datos
    await prisma.media.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: "Medio eliminado exitosamente"
    });

  } catch (error) {
    console.error('Error en deleteMedia:', error);
    res.status(500).json({ 
      error: "Error interno del servidor al eliminar medio" 
    });
  }
};

/**
 * Obtener medio por ID
 */
const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;
    const blogId = req.user?.blogId;

    const media = await prisma.media.findFirst({
      where: {
        id: parseInt(id),
        blogId: parseInt(blogId)
      }
    });

    if (!media) {
      return res.status(404).json({ error: "Medio no encontrado" });
    }

    // Procesar variants
    const variants = typeof media.variants === 'string' ? 
      JSON.parse(media.variants) : 
      media.variants || {};

    res.json({
      success: true,
      data: {
        ...media,
        variants,
        url: media.cloudinaryUrl || media.path
      }
    });

  } catch (error) {
    console.error('Error en getMediaById:', error);
    res.status(500).json({ 
      error: "Error interno del servidor al obtener medio" 
    });
  }
};

export {
  uploadImage,
  getMedia,
  deleteMedia,
  getMediaById
};