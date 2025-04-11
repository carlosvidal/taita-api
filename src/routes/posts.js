import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = express.Router();

// Get all posts
router.get("/", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single post by UUID
router.get("/uuid/:uuid", async (req, res) => {
  try {
    console.log("Buscando post por UUID:", req.params.uuid);
    const post = await prisma.post.findUnique({
      where: { uuid: req.params.uuid },
      include: { category: true, author: true },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (error) {
    console.error("Error al buscar post por UUID:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single post by ID or UUID
router.get("/:id", async (req, res) => {
  try {
    // Verificar si el ID podría ser un UUID
    if (req.params.id && req.params.id.includes('-')) {
      console.log("El ID parece ser un UUID, buscando por UUID...");
      const post = await prisma.post.findUnique({
        where: { uuid: req.params.id },
        include: { category: true, author: true },
      });
      if (post) {
        return res.json(post);
      }
    }
    
    // Intentar buscar por ID numérico
    try {
      const postById = await prisma.post.findUnique({
        where: { id: parseInt(req.params.id) },
        include: { category: true, author: true },
      });
      if (postById) {
        return res.json(postById);
      }
    } catch (parseError) {
      console.log("No se pudo parsear el ID como número");
    }
    
    // Si llegamos aquí, no se encontró el post
    return res.status(404).json({ error: "Post not found" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create post
router.post("/", async (req, res) => {
  try {
    const { title, content, slug, categoryId, image, thumbnail } = req.body;
    const post = await prisma.post.create({
      data: {
        title,
        content,
        slug,
        categoryId: parseInt(categoryId),
        image,
        thumbnail,
      },
    });
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update post
router.put("/:id", async (req, res) => {
  try {
    const { title, content, slug, categoryId, image, thumbnail } = req.body;
    const post = await prisma.post.update({
      where: { id: parseInt(req.params.id) },
      data: {
        title,
        content,
        slug,
        categoryId: parseInt(categoryId),
        image,
        thumbnail,
      },
    });
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete post
router.delete("/:id", async (req, res) => {
  try {
    await prisma.post.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
