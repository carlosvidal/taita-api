import sharp from "sharp";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
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
 * Sube una imagen, la convierte a WebP y crea versiones en diferentes tamaños
 */
const uploadImage = async (req, res) => {
  try {
    console.log('Request files:', req.files);
    console.log('Request file:', req.file);
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
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
    const { entityType, entityId } = req.body;
    
    // Validar tipo de imagen
    if (!mimetype.startsWith('image/')) {
      return res.status(400).json({ error: "El archivo debe ser una imagen" });
    }

    // Crear directorio de uploads si no existe
    const uploadsBaseDir = path.join(__dirname, "../../../uploads");
    const entityDir = path.join(uploadsBaseDir, entityType || 'general');
    
    if (!fs.existsSync(uploadsBaseDir)) {
      fs.mkdirSync(uploadsBaseDir, { recursive: true });
    }
    
    if (!fs.existsSync(entityDir)) {
      fs.mkdirSync(entityDir, { recursive: true });
    }

    // Generar nombre de archivo único
    const uniqueFilename = generateUniqueFilename(originalname);
    
    // Definir rutas de archivos
    const originalFilename = `${uniqueFilename}.webp`;
    const originalPath = path.join(entityDir, originalFilename);
    
    // Guardar imagen original optimizada
    await sharp(buffer)
      .webp({ quality: 80 })
      .toFile(originalPath);

    // Crear versiones en diferentes tamaños
    const sizes = [
      { width: 800, suffix: "_medium" },
      { width: 400, suffix: "_small" },
    ];

    const generatedFiles = [
      { size: 'original', filename: originalFilename }
    ];

    for (const size of sizes) {
      const resizedFilename = `${uniqueFilename}${size.suffix}.webp`;
      const outputPath = path.join(entityDir, resizedFilename);
      
      await sharp(buffer)
        .resize(size.width)
        .webp({ quality: 80 })
        .toFile(outputPath);
      
      generatedFiles.push({
        size: size.suffix.replace('_', ''),
        filename: resizedFilename
      });
    }

    // Guardar información en la base de datos
    const entityFolder = entityType || 'general';
    const media = await prisma.media.create({
      data: {
        filename: originalFilename,
        originalName: originalname,
        mimeType: 'image/webp',
        path: `uploads/${entityFolder}/${originalFilename}`,
        size: fs.statSync(originalPath).size,
        entityType: entityType || null,
        entityId: entityId || null,
        variants: JSON.stringify(generatedFiles)
      }
    });

    // Construir URLs para las diferentes versiones
    const urls = {
      id: media.id,
      uuid: media.uuid,
      original: `uploads/${entityFolder}/${originalFilename}`,
      medium: `uploads/${entityFolder}/${uniqueFilename}_medium.webp`,
      small: `uploads/${entityFolder}/${uniqueFilename}_small.webp`,
      createdAt: media.createdAt
    };

    res.status(201).json(urls);
  } catch (error) {
    console.error("Error al procesar la imagen:", error);
    res.status(500).json({ error: "Error al procesar la imagen", details: error.message });
  }
};

/**
 * Obtiene todas las imágenes
 */
const getAllMedia = async (req, res) => {
  try {
    const media = await prisma.media.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Transformar los resultados para incluir URLs completas
    const mediaWithUrls = media.map(item => {
      const variants = JSON.parse(item.variants || '[]');
      const urls = {};
      
      // Obtener la carpeta de la entidad desde la ruta
      const pathParts = item.path.split('/');
      const entityFolder = pathParts[1] || 'general';
      
      variants.forEach(variant => {
        urls[variant.size] = `uploads/${entityFolder}/${variant.filename}`;
      });

      return {
        id: item.id,
        uuid: item.uuid,
        originalName: item.originalName,
        entityType: item.entityType,
        entityId: item.entityId,
        createdAt: item.createdAt,
        urls
      };
    });

    res.json(mediaWithUrls);
  } catch (error) {
    console.error("Error al obtener medios:", error);
    res.status(500).json({ error: "Error al obtener medios" });
  }
};

/**
 * Elimina una imagen y sus variantes
 */
const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar el medio en la base de datos
    const media = await prisma.media.findUnique({
      where: { id: parseInt(id) }
    });

    if (!media) {
      return res.status(404).json({ error: "Medio no encontrado" });
    }

    // Eliminar los archivos físicos
    const variants = JSON.parse(media.variants || '[]');
    const baseDir = path.join(__dirname, "../../../");
    const basePath = media.path.substring(0, media.path.lastIndexOf('/'));
    
    for (const variant of variants) {
      const filePath = path.join(baseDir, basePath, variant.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Eliminar el registro de la base de datos
    await prisma.media.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "Medio eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar medio:", error);
    res.status(500).json({ error: "Error al eliminar medio" });
  }
};

export {
  uploadImage,
  getAllMedia,
  deleteMedia
};
