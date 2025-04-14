import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { PrismaClient } from "@prisma/client";
import { authenticateUser } from "../middleware/authMiddleware.js";

// Obtener __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();
const router = express.Router();

// Configuración de multer para manejar la carga de archivos
// Usar memoryStorage como en el módulo de media que funciona correctamente
const storage = multer.memoryStorage();

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

// Ruta para subir imagen de perfil (prueba)
router.post("/upload/:uuid", authenticateUser, upload.single('picture'), handleMulterError, async (req, res) => {
  try {
    console.log('Solicitud recibida para subir imagen de perfil (prueba)');
    console.log('Parámetros:', req.params);
    console.log('Archivo recibido:', req.file ? 'Sí' : 'No');
    
    if (!req.file) {
      return res.status(400).json({ error: "No se proporcionó ninguna imagen" });
    }
    
    // Usar req.file ya que estamos usando upload.single
    const { buffer, originalname, mimetype } = req.file;
    console.log('Archivo recibido correctamente:', { 
      originalname, 
      mimetype, 
      size: buffer?.length || 0 
    });
    
    const { uuid } = req.params;
    
    // Verificar si el usuario existe
    const user = await prisma.admin.findUnique({
      where: { uuid }
    });
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    // Crear directorio de uploads si no existe
    const uploadDir = path.join(__dirname, '../../../uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Generar nombre de archivo único
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'profile-' + uniqueSuffix + path.extname(originalname);
    const filePath = path.join(uploadDir, filename);
    
    // Guardar el archivo en disco
    fs.writeFileSync(filePath, buffer);
    console.log('Archivo guardado en:', filePath);
    
    // Convertir la ruta absoluta a una ruta relativa desde la raíz del proyecto
    const projectRoot = path.join(__dirname, '../../..');
    const picturePath = '/' + path.relative(projectRoot, filePath).replace(/\\/g, '/');
    
    // Actualizar el perfil con la nueva imagen
    const updatedUser = await prisma.admin.update({
      where: { uuid },
      data: { picture: picturePath }
    });
    
    // No enviar la contraseña en la respuesta
    const { password, ...userWithoutPassword } = updatedUser;
    
    res.json({
      message: "Imagen de perfil actualizada con éxito",
      user: userWithoutPassword
    });
  } catch (error) {
    console.error("Error al actualizar foto de perfil:", error);
    res.status(500).json({ error: "Error al actualizar foto de perfil" });
  }
});

export default router;
