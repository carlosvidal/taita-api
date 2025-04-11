import express from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Create media
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { filename, path: filePath, mimetype, size } = req.file;
    const media = await prisma.media.create({
      data: {
        filename,
        path: filePath,
        type: mimetype,
        size,
      },
    });
    res.json(media);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload media
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { filename, path: filePath, mimetype, size } = req.file;
    const media = await prisma.media.create({
      data: {
        filename,
        path: filePath,
        type: mimetype,
        size,
      },
    });
    res.json(media);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all media
router.get("/", async (req, res) => {
  try {
    const media = await prisma.media.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(media);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single media
router.get("/:id", async (req, res) => {
  try {
    const media = await prisma.media.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }
    res.json(media);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update media metadata
router.put("/:id", async (req, res) => {
  try {
    const { filename } = req.body;
    const media = await prisma.media.update({
      where: { id: parseInt(req.params.id) },
      data: { filename },
    });
    res.json(media);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete media
router.delete("/:id", async (req, res) => {
  try {
    const media = await prisma.media.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, "../../", media.path);
    fs.unlinkSync(filePath);

    // Delete from database
    await prisma.media.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({ message: "Media deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
