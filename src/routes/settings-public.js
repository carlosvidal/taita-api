import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = express.Router();

// Endpoint público para obtener la configuración (para el frontend público)
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
