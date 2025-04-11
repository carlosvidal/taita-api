import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = express.Router();

// Get all pages
router.get("/", async (req, res) => {
  try {
    const pages = await prisma.page.findMany();
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single page by UUID
router.get("/uuid/:uuid", async (req, res) => {
  try {
    console.log("Buscando página por UUID:", req.params.uuid);
    const page = await prisma.page.findUnique({
      where: { uuid: req.params.uuid },
      include: { author: true }
    });
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  } catch (error) {
    console.error("Error al buscar página por UUID:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single page by slug
router.get("/:slug", async (req, res) => {
  try {
    // Verificar si el slug podría ser un UUID
    if (req.params.slug && req.params.slug.includes('-')) {
      console.log("El slug parece ser un UUID, redirigiendo...");
      const page = await prisma.page.findUnique({
        where: { uuid: req.params.slug },
        include: { author: true }
      });
      if (page) {
        return res.json(page);
      }
    }
    
    const page = await prisma.page.findUnique({
      where: { slug: req.params.slug },
    });
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create page
router.post("/", async (req, res) => {
  try {
    const { title, slug, content, authorId, excerpt } = req.body;
    const page = await prisma.page.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        author: { connect: { id: authorId } },
      },
    });
    res.json(page);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update page
router.put("/:id", async (req, res) => {
  try {
    const { title, slug, content, excerpt } = req.body;
    const page = await prisma.page.update({
      where: { id: parseInt(req.params.id) },
      data: { title, slug, content, excerpt },
    });
    res.json(page);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete page
router.delete("/:id", async (req, res) => {
  try {
    await prisma.page.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Page deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
