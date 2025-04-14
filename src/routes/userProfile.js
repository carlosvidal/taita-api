import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  getUserProfileByUuid, 
  getAllUserProfiles, 
  updateUserProfile, 
  updateProfilePicture,
  createUser
} from "../controllers/userProfileController.js";
import {
  authenticateUser,
  isAdmin,
  isProfileOwnerOrAdmin
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Configuración de multer para subir imágenes de perfil
const uploadDir = path.join(process.cwd(), '..', 'uploads', 'profiles');
console.log('Directorio de uploads configurado en:', uploadDir);

// Crear carpeta para imágenes de perfil si no existe
if (!fs.existsSync(uploadDir)) {
  console.log('Creando directorio de uploads:', uploadDir);
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Directorio creado exitosamente');
  } catch (error) {
    console.error('Error al crear directorio de uploads:', error);
  }
}

// Usar memoryStorage como en el módulo de media que funciona correctamente
const storage = multer.memoryStorage();

// Configuración similar a la del módulo de media que funciona correctamente
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
  fileFilter: (req, file, cb) => {
    console.log('Multer: verificando tipo de archivo:', file.mimetype);
    // Verificar que sea una imagen
    if (file.mimetype.startsWith('image/')) {
      console.log('Multer: tipo de archivo válido');
      return cb(null, true);
    }
    console.log('Multer: tipo de archivo inválido');
    cb(new Error("Solo se permiten imágenes"), false);
  }
});

// Middleware para manejar errores de Multer
const handleMulterError = (err, req, res, next) => {
  console.error('Error en Multer:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 5MB.' });
    }
    return res.status(400).json({ error: `Error al subir imagen: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// fs ya está importado arriba

// Rutas para perfiles de usuario
router.get("/", authenticateUser, isAdmin, getAllUserProfiles); // Solo admin puede ver todos los usuarios
router.get("/uuid/:uuid", authenticateUser, isProfileOwnerOrAdmin, getUserProfileByUuid); // Solo el propio usuario o admin
router.put("/uuid/:uuid", authenticateUser, isProfileOwnerOrAdmin, updateUserProfile); // Solo el propio usuario o admin

// Ruta para subir imagen de perfil con manejo de errores mejorado
// Simplificamos la ruta para que sea más similar a la del módulo de media
router.post("/uuid/:uuid/picture", 
  authenticateUser, 
  isProfileOwnerOrAdmin, 
  upload.single('picture'), 
  handleMulterError,
  updateProfilePicture
); 

router.post("/", authenticateUser, isAdmin, createUser); // Solo admin puede crear usuarios

export default router;
