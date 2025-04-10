const express = require("express");
const router = express.Router();
const mediaController = require("../controllers/mediaController");
const multer = require("multer");

// Configuración de Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Endpoint para subir imágenes
router.post("/upload", upload.single("image"), mediaController.uploadImage);

module.exports = router;
