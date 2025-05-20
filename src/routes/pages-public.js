import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = express.Router();

// Obtener página pública por slug y tenant
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const subdomain = req.query.subdomain || req.headers['x-tenant'] || 'demo';

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

    // Buscar la página pública por slug y blog
    const page = await prisma.page.findFirst({
      where: {
        blogId: blog.id,
        slug,
        published: true,
        visible: true,
      },
    });
    if (!page) return res.status(404).json({ error: 'Página no encontrada' });
    res.json(page);
  } catch (error) {
    console.error('Error al obtener página pública:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
