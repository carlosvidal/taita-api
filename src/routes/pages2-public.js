import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = express.Router();

// Endpoint público para obtener una página por slug y tenant
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    // Extracción robusta del subdominio
    const host = req.headers.host || '';
    let subdomain = '';
    let domain = '';
    if (req.headers['x-taita-subdomain']) {
      subdomain = req.headers['x-taita-subdomain'];
    } else if (req.query.subdomain) {
      subdomain = req.query.subdomain;
    } else if (host) {
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        subdomain = 'demo';
      } else {
        const parts = host.split('.');
        if (parts.length >= 3 && parts[0] !== 'www') {
          subdomain = parts[0];
          domain = parts.slice(1).join('.');
        } else if (parts.length === 2) {
          domain = host;
          subdomain = 'default';
        } else if (parts[0] === 'www' && parts.length >= 3) {
          domain = parts.slice(1).join('.');
          subdomain = 'default';
        }
      }
    }
    if (!subdomain) {
      subdomain = 'demo';
    }
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
    console.error('Error en pages2-public:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
