import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = express.Router();

// Endpoint público para obtener posts publicados (para el frontend público)
router.get("/", async (req, res) => {
  try {
    // Obtener tenant desde query o header
    const tenant = req.query.tenant || req.headers['x-taita-tenant'];
    if (!tenant) {
      return res.status(400).json({ error: "El parámetro 'tenant' es requerido" });
    }
    // Buscar el blog correspondiente al tenant
    const blog = await prisma.blog.findFirst({
      where: {
        OR: [
          { subdomain: tenant },
          { domain: tenant },
        ],
      },
    });
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    // Obtener solo los posts publicados del blog
    const posts = await prisma.post.findMany({
      where: {
        blogId: blog.id,
        status: 'PUBLISHED'
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            uuid: true,
            name: true
          }
        }
      },
      orderBy: { publishedAt: "desc" }
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint público para obtener un post específico por slug
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    // Obtener tenant desde query o header
    const tenant = req.query.tenant || req.headers['x-taita-tenant'];
    if (!tenant) {
      return res.status(400).json({ error: "El parámetro 'tenant' es requerido" });
    }
    // Buscar el blog correspondiente al tenant
    const blog = await prisma.blog.findFirst({
      where: {
        OR: [
          { subdomain: tenant },
          { domain: tenant },
        ],
      },
    });
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    // Buscar el post por slug y blogId
    const post = await prisma.post.findFirst({
      where: {
        slug,
        blogId: blog.id,
        status: 'PUBLISHED'
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            uuid: true,
            name: true
          }
        }
      }
    });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
