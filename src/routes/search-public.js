import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = express.Router();

// Búsqueda pública de posts y páginas
router.get('/', async (req, res) => {
  try {
    const { q = "", subdomain = "demo" } = req.query;
    // Buscar el blog correspondiente al tenant
    const blog = await prisma.blog.findFirst({
      where: {
        OR: [
          { subdomain: subdomain },
          { domain: subdomain },
        ],
      },
      select: { id: true },
    });
    if (!blog) return res.status(404).json({ error: 'Blog no encontrado' });

    // Buscar posts públicos
    const posts = await prisma.post.findMany({
      where: {
        blogId: blog.id,
        status: 'PUBLISHED',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { publishedAt: 'desc' },
    });

    // Buscar páginas públicas
    const pages = await prisma.page.findMany({
      where: {
        blogId: blog.id,
        published: true,
        visible: true,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ posts, pages });
  } catch (error) {
    console.error('Error en búsqueda pública:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
