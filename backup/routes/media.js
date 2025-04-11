const express = require("express");
const router = express.Router();
const mediaController = require("../controllers/mediaController");
const multer = require("multer");

// Configuración de Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).fields([
  { name: "image", maxCount: 1 },
  { name: "userId", maxCount: 1 },
  { name: "purpose", maxCount: 1 },
]);

// Endpoint para subir imágenes
router.post("/upload", upload, mediaController.uploadImage);

module.exports = router;
