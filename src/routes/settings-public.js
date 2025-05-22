import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = express.Router();

// Endpoint público para obtener la configuración (para el frontend público)
router.get('/', async (req, res) => {
  try {
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
        blog = await prisma.blog.findFirst({ where: { subdomain, domain } });
      }
      if (!blog) {
        blog = await prisma.blog.findFirst({ where: { subdomain } });
      }
    }
    if (!blog) {
      if (req.query.blogId) {
        blog = await prisma.blog.findUnique({ where: { id: parseInt(req.query.blogId) } });
      } else if (req.query.blogUuid) {
        blog = await prisma.blog.findFirst({ where: { uuid: req.query.blogUuid } });
      }
    }
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    // blog encontrado, continuar normalmente
    console.log('Blog encontrado para configuración:', blog.name, 'ID:', blog.id);
    
    // Obtener los datos del blog como configuración
    const { id, uuid, createdAt, updatedAt, adminId, ...blogSettings } = blog;
    
    // Asegurarse de que los campos JSON se devuelvan como objetos
    if (blogSettings.socialNetworks && typeof blogSettings.socialNetworks === 'string') {
      try {
        blogSettings.socialNetworks = JSON.parse(blogSettings.socialNetworks);
      } catch (e) {
        console.error('Error al parsear socialNetworks:', e);
        blogSettings.socialNetworks = {};
      }
    }
    
    // Devolver los datos del blog como configuración
    res.json(blogSettings);
  } catch (error) {
    console.error('Error al obtener configuración pública:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
