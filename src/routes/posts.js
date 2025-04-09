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

// Get single post
router.get("/:id", async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { category: true },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
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
