const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const uploadImage = async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res
        .status(400)
        .json({ error: "No se proporcionó ninguna imagen" });
    }

    const { userId, purpose } = req.body;
    const { buffer, originalname } = req.files.image[0];
    const uploadPath = path.join(__dirname, "../uploads");

    // Crear directorio de uploads si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Guardar imagen original
    const originalPath = path.join(
      uploadPath,
      `${path.parse(originalname).name}.webp`
    );
    await sharp(buffer).webp({ quality: 80 }).toFile(originalPath);

    // Crear versiones en diferentes tamaños
    const sizes = [
      { width: 800, suffix: "_medium" },
      { width: 400, suffix: "_small" },
    ];

    for (const size of sizes) {
      const outputPath = path.join(
        uploadPath,
        `${path.parse(originalname).name}${size.suffix}.webp`
      );
      await sharp(buffer)
        .resize(size.width)
        .webp({ quality: 80 })
        .toFile(outputPath);
    }

    res
      .status(201)
      .json({ message: "Imágenes subidas y convertidas exitosamente" });
  } catch (error) {
    console.error("Error al procesar la imagen:", error);
    res.status(500).json({ error: "Error al procesar la imagen" });
  }
};

module.exports = {
  uploadImage,
};
