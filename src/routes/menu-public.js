import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = express.Router();

// Endpoint público para obtener el menú (para el frontend público)
router.get('/', async (req, res) => {
  try {
    // Obtener tenant desde query o header (igual que posts-public.js)
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
    
    console.log(`Encontrados ${allMenuItems.length} ítems de menú para el blog ${blog.name}`);
    
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
    console.log(`Menú construido con ${menuItems.length} ítems de primer nivel`);
    
    console.log(`Encontrados ${menuItems.length} items de menú para el blog ${blog.name}`);
    res.json(menuItems);
  } catch (error) {
    console.error('Error al obtener menú público:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
