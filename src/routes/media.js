import express from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { uploadImage, getMedia, deleteMedia } from "../controllers/mediaController.js";

const prisma = new PrismaClient();

const router = express.Router();

// Configuración de multer para manejar la carga de archivos
const storage = multer.memoryStorage(); // Almacenar en memoria para procesar con sharp

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
  console.error('Error de Multer:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 5MB.' });
    }
    return res.status(400).json({ error: `Error de carga: ${err.message}` });
  } else if (err) {
    return res.status(500).json({ error: `Error del servidor: ${err.message}` });
  }
  next();
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limitar a 5MB
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer recibió archivo:', file.originalname, file.mimetype);
    // Aceptar solo imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  },
});

// Ruta para subir imágenes
router.post("/upload", upload.single('image'), handleMulterError, uploadImage);

// Ruta para obtener todas las imágenes
router.get("/", getMedia);

// Ruta para eliminar una imagen
router.delete("/:id", deleteMedia);

// Ruta para obtener una imagen por UUID
router.get("/uuid/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const media = await prisma.media.findUnique({
      where: { uuid }
    });
    
    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }
    
    // Transformar los resultados para incluir URLs completas
    const variants = JSON.parse(media.variants || '[]');
    const urls = {};
    
    variants.forEach(variant => {
      const baseUrl = media.path.substring(0, media.path.lastIndexOf('/'));
      urls[variant.size] = `${baseUrl}/${variant.filename}`;
    });
    
    res.json({
      id: media.id,
      uuid: media.uuid,
      originalName: media.originalName,
      entityType: media.entityType,
      entityId: media.entityId,
      createdAt: media.createdAt,
      urls
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
