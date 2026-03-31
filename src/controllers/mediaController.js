import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import r2Service from "../services/r2.js";
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

    // Obtener blogId: API key auth (req.blog) o JWT auth (req.user)
    let blogId = req.blog?.id || req.user?.blogId || req.body.blogId;

    // WORKAROUND: Si no hay blogId en el token, buscar el blog del usuario
    if (!blogId && req.user?.id) {
      try {
        const userWithBlog = await prisma.admin.findUnique({
          where: { id: req.user.id },
          include: { blogs: true }
        });
        if (userWithBlog?.blogs?.[0]) {
          blogId = userWithBlog.blogs[0].id;
        }
      } catch (dbError) {
        console.error('Error buscando blog del usuario:', dbError);
      }
    }

    if (!blogId) {
      return res.status(400).json({ error: "Blog ID es requerido" });
    }
    
    console.log('blogId final a usar:', blogId);

    let uploadResult;
    let finalPath;
    let variants = {};
    let storageKey = null;
    let storageUrl = null;

    const uniqueFilename = generateUniqueFilename(originalname);

    // Procesar imagen con Sharp — 3 variantes
    const originalBuffer = await sharp(buffer)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();

    const ogBuffer = await sharp(buffer)
      .resize(1500, 786, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const thumbBuffer = await sharp(buffer)
      .resize(400, 210, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Intentar R2 primero
    if (r2Service.isConfigured()) {
      try {
        console.log('Subiendo a Cloudflare R2...');
        const keyOriginal = `${blogId}/original/${uniqueFilename}.webp`;
        const keyOg = `${blogId}/og/${uniqueFilename}.webp`;
        const keyThumb = `${blogId}/thumb/${uniqueFilename}.webp`;

        const [urlOriginal, urlOg, urlThumb] = await Promise.all([
          r2Service.uploadBuffer(originalBuffer, keyOriginal),
          r2Service.uploadBuffer(ogBuffer, keyOg),
          r2Service.uploadBuffer(thumbBuffer, keyThumb),
        ]);

        storageKey = keyOriginal;
        storageUrl = urlOriginal;
        finalPath = urlOriginal;
        variants = { original: urlOriginal, og: urlOg, thumb: urlThumb };

        uploadResult = { success: true, url: urlOriginal, storageKey, variants };
        console.log('Imagen subida a R2:', { storageKey, storageUrl });
      } catch (r2Error) {
        console.error('Error al subir a R2:', r2Error.message);
        console.log('Fallando a almacenamiento local...');
        uploadResult = null;
      }
    } else {
      console.log('R2 no configurado, usando almacenamiento local...');
    }

    // Fallback a almacenamiento local
    if (!uploadResult) {
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      const entityDir = path.join(uploadsDir, entityType);
      if (!fs.existsSync(entityDir)) {
        fs.mkdirSync(entityDir, { recursive: true });
      }

      const mainPath = path.join(entityDir, `${uniqueFilename}.webp`);
      const ogPath = path.join(entityDir, `${uniqueFilename}_og.webp`);
      const thumbPath = path.join(entityDir, `${uniqueFilename}_thumb.webp`);

      await Promise.all([
        fs.promises.writeFile(mainPath, originalBuffer),
        fs.promises.writeFile(ogPath, ogBuffer),
        fs.promises.writeFile(thumbPath, thumbBuffer),
      ]);

      finalPath = `/${entityType}/${uniqueFilename}.webp`;
      variants = {
        original: finalPath,
        og: `/${entityType}/${uniqueFilename}_og.webp`,
        thumb: `/${entityType}/${uniqueFilename}_thumb.webp`
      };
      uploadResult = { success: true, url: finalPath, variants, local: true };
    }

    // Guardar en base de datos
    const mediaRecord = await prisma.media.create({
      data: {
        uuid: uuidv4(),
        filename: `${uniqueFilename}.webp`,
        originalName: originalname,
        mimeType: 'image/webp',
        path: finalPath,
        size: buffer.length,
        entityType,
        entityId: entityId || null,
        blogId: parseInt(blogId),
        variants: JSON.stringify(variants),
        storageKey,
        storageUrl,
      }
    });

    res.status(201).json({
      success: true,
      message: storageKey ? "Imagen subida a R2" : "Imagen subida al almacenamiento local",
      media: {
        id: mediaRecord.id,
        uuid: mediaRecord.uuid,
        url: storageUrl || finalPath,
        variants,
        filename: mediaRecord.filename,
        originalName: mediaRecord.originalName,
        mimeType: mediaRecord.mimeType,
        size: mediaRecord.size,
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
    console.log('=== getMedia called ===');
    const { page = 1, limit = 20, entityType } = req.query;
    let blogId = req.user?.blogId;
    console.log('Initial blogId from token:', blogId);

    // WORKAROUND: Si no hay blogId en el token, buscar el blog del usuario
    if (!blogId && req.user?.id) {
      try {
        const userWithBlog = await prisma.admin.findUnique({
          where: { id: req.user.id },
          include: { blogs: true }
        });
        
        if (userWithBlog?.blogs?.[0]) {
          blogId = userWithBlog.blogs[0].id;
        }
      } catch (dbError) {
        console.error('Error buscando blog del usuario en getMedia:', dbError);
      }
    }

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
      url: item.storageUrl || item.path
    }));

    const total = await prisma.media.count({ where });

    console.log('processedMedia:', processedMedia);
    console.log('total:', total);

    const response = {
      success: true,
      data: processedMedia,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    console.log('getMedia response:', JSON.stringify(response, null, 2));
    res.json(response);

  } catch (error) {
    console.error('Error en getMedia:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: "Error interno del servidor al obtener medios",
      details: error.message
    });
  }
};

/**
 * Eliminar medio
 */
const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    let blogId = req.user?.blogId;

    // WORKAROUND: Si no hay blogId en el token, buscar el blog del usuario
    if (!blogId && req.user?.id) {
      try {
        const userWithBlog = await prisma.admin.findUnique({
          where: { id: req.user.id },
          include: { blogs: true }
        });
        
        if (userWithBlog?.blogs?.[0]) {
          blogId = userWithBlog.blogs[0].id;
        }
      } catch (dbError) {
        console.error('Error buscando blog del usuario en deleteMedia:', dbError);
      }
    }

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

    // Eliminar de R2 si existe
    if (media.storageKey) {
      try {
        // Eliminar las 3 variantes de R2
        const baseKey = media.storageKey.replace('/original/', '/VARIANT/').replace('.webp', '.webp');
        const variants = typeof media.variants === 'string' ? JSON.parse(media.variants) : media.variants || {};
        const keysToDelete = [media.storageKey];
        // Extraer keys de las URLs de variantes
        const publicUrl = process.env.R2_PUBLIC_URL || '';
        for (const url of Object.values(variants)) {
          if (typeof url === 'string' && url.startsWith(publicUrl)) {
            keysToDelete.push(url.replace(`${publicUrl}/`, ''));
          }
        }
        await Promise.all(keysToDelete.map(key => r2Service.deleteObject(key).catch(e => console.error('Error deleting R2 key:', key, e.message))));
        console.log('Imágenes eliminadas de R2:', keysToDelete);
      } catch (r2Error) {
        console.error('Error al eliminar de R2:', r2Error);
      }
    }

    // Eliminar archivos locales si existen
    if (media.path && !media.storageKey) {
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
    let blogId = req.user?.blogId;

    // WORKAROUND: Si no hay blogId en el token, buscar el blog del usuario
    if (!blogId && req.user?.id) {
      try {
        const userWithBlog = await prisma.admin.findUnique({
          where: { id: req.user.id },
          include: { blogs: true }
        });
        
        if (userWithBlog?.blogs?.[0]) {
          blogId = userWithBlog.blogs[0].id;
        }
      } catch (dbError) {
        console.error('Error buscando blog del usuario en getMediaById:', dbError);
      }
    }

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
        url: media.storageUrl || media.cloudinaryUrl || media.path
      }
    });

  } catch (error) {
    console.error('Error en getMediaById:', error);
    res.status(500).json({ 
      error: "Error interno del servidor al obtener medio" 
    });
  }
};

/**
 * Upload image from a public URL (for API v1 / MCP)
 */
const uploadImageFromUrl = async (req, res) => {
  try {
    const { url, filename } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Download image from URL
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(400).json({ error: `Failed to fetch image: ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: "URL does not point to a valid image" });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const originalname = filename || path.basename(new URL(url).pathname) || 'image.jpg';

    // Inject into req so we can reuse uploadImage logic
    req.file = { buffer, originalname, mimetype: contentType };
    return uploadImage(req, res);
  } catch (error) {
    console.error('Error en uploadImageFromUrl:', error);
    res.status(500).json({ error: "Error downloading or processing image" });
  }
};

export {
  uploadImage,
  uploadImageFromUrl,
  getMedia,
  deleteMedia,
  getMediaById
};