import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = express.Router();

// Endpoint público para obtener el menú (para el frontend público)
router.get('/', async (req, res) => {
  try {
    console.log('[menu-public] === REQUEST START ===');
    console.log('[menu-public] Headers:', {
      host: req.headers.host,
      'x-taita-subdomain': req.headers['x-taita-subdomain'],
      origin: req.headers.origin
    });
    console.log('[menu-public] Query params:', req.query);

    // Extraer subdominio y dominio igual que posts-public.js
    const host = req.headers.host || '';
    let subdomain = '';
    let domain = '';
    if (req.headers['x-taita-subdomain']) {
      subdomain = req.headers['x-taita-subdomain'];
      console.log('[menu-public] Using subdomain from header:', subdomain);
    } else if (req.query.subdomain) {
      subdomain = req.query.subdomain;
      console.log('[menu-public] Using subdomain from query:', subdomain);
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
    console.log('Blog encontrado para menú:', blog.name, 'ID:', blog.id);
    
    // Obtener todos los ítems del menú para este blog
    const allMenuItems = await prisma.menuItem.findMany({
      where: { blogId: blog.id },
      orderBy: { order: 'asc' },
      include: {
        children: {
          orderBy: { order: 'asc' }
        }
      }
    });

    console.log(`[menu-public] Blog: ${blog.name} (ID: ${blog.id})`);
    console.log(`[menu-public] Found ${allMenuItems.length} menu items`);
    console.log(`[menu-public] Menu items raw data:`, JSON.stringify(allMenuItems, null, 2));

    // Construir la jerarquía de menús
    const buildMenuHierarchy = (items, parentId = null) => {
      return items
        .filter(item => item.parentId === parentId)
        .sort((a, b) => a.order - b.order)
        .map(item => ({
          id: item.id,
          uuid: item.uuid,
          label: item.label,
          url: item.url,
          order: item.order,
          children: buildMenuHierarchy(items, item.id)
        }));
    };

    const menuItems = buildMenuHierarchy(allMenuItems);
    console.log(`[menu-public] Menu hierarchy built with ${menuItems.length} top-level items`);
    console.log(`[menu-public] Final menu structure:`, JSON.stringify(menuItems, null, 2));

    res.json(menuItems);
  } catch (error) {
    console.error('Error al obtener menú público:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
