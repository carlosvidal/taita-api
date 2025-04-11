import express from "express";
import multer from "multer";
import path from "path";
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
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Solo se permiten imágenes (jpeg, jpg, png, gif)"));
  }
});

// Crear carpeta para imágenes de perfil si no existe
import fs from "fs";
const uploadDir = 'uploads/profiles';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Rutas para perfiles de usuario
router.get("/", authenticateUser, isAdmin, getAllUserProfiles); // Solo admin puede ver todos los usuarios
router.get("/uuid/:uuid", authenticateUser, isProfileOwnerOrAdmin, getUserProfileByUuid); // Solo el propio usuario o admin
router.put("/uuid/:uuid", authenticateUser, isProfileOwnerOrAdmin, updateUserProfile); // Solo el propio usuario o admin
router.post("/uuid/:uuid/picture", authenticateUser, isProfileOwnerOrAdmin, upload.single('picture'), updateProfilePicture); // Solo el propio usuario o admin
router.post("/", authenticateUser, isAdmin, createUser); // Solo admin puede crear usuarios

export default router;
