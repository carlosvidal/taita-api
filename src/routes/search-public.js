import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = express.Router();

// Búsqueda pública de posts y páginas
router.get('/', async (req, res) => {
  try {
    const { q = "" } = req.query;
    // Extraer subdominio y dominio igual que posts-public.js
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
    let blog;
    if (subdomain) {
      if (domain) {
        blog = await prisma.blog.findFirst({ where: { subdomain, domain }, select: { id: true } });
      }
      if (!blog) {
        blog = await prisma.blog.findFirst({ where: { subdomain }, select: { id: true } });
      }
    }
    if (!blog) {
      if (req.query.blogId) {
        blog = await prisma.blog.findUnique({ where: { id: parseInt(req.query.blogId) }, select: { id: true } });
      } else if (req.query.blogUuid) {
        blog = await prisma.blog.findFirst({ where: { uuid: req.query.blogUuid }, select: { id: true } });
      }
    }
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
