import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = express.Router();

// Endpoint público para obtener el menú (para el frontend público)
router.get('/', async (req, res) => {
  try {
    // Obtener el subdominio y dominio de la solicitud
    const host = req.headers.host || '';
    console.log('Host completo para menú:', host);
    
    // Extraer subdominio y dominio
    let subdomain = '';
    let domain = '';
    
    // Manejar casos especiales como localhost o IP
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      subdomain = req.query.subdomain || 'demo'; // Usar un subdominio por defecto para desarrollo local
      console.log('Desarrollo local, usando subdominio para menú:', subdomain);
    } else {
      // Dividir el host por puntos
      const parts = host.split('.');
      
      if (parts.length >= 3 && parts[0] !== 'www') {
        // Formato: subdomain.domain.tld
        subdomain = parts[0];
        domain = parts.slice(1).join('.');
      } else if (parts.length === 2) {
        // Formato: domain.tld (sin subdominio)
        domain = host;
      } else if (parts[0] === 'www' && parts.length >= 3) {
        // Formato: www.domain.tld
        domain = parts.slice(1).join('.');
      }
    }
    
    console.log('Subdominio extraído para menú:', subdomain);
    console.log('Dominio extraído para menú:', domain);
    
    // Buscar el blog por subdominio y/o dominio
    let blog;
    
    if (subdomain) {
      // Primero intentar buscar por subdominio y dominio
      if (domain) {
        blog = await prisma.blog.findFirst({
          where: {
            subdomain,
            domain
          }
        });
        
        if (blog) {
          console.log('Blog encontrado por subdominio y dominio para menú:', blog.name);
        }
      }
      
      // Si no se encuentra, buscar solo por subdominio
      if (!blog) {
        blog = await prisma.blog.findFirst({
          where: { subdomain }
        });
        
        if (blog) {
          console.log('Blog encontrado solo por subdominio para menú:', blog.name);
        }
      }
    } 
    
    // Si no se encontró por subdominio, intentar por parámetros de consulta
    if (!blog) {
      if (req.query.blogId) {
        // Si se proporciona un blogId en la consulta
        blog = await prisma.blog.findUnique({
          where: { id: parseInt(req.query.blogId) }
        });
        
        if (blog) {
          console.log('Blog encontrado por blogId para menú:', blog.name);
        }
      } else if (req.query.blogUuid) {
        // Si se proporciona un UUID de blog en la consulta
        blog = await prisma.blog.findFirst({
          where: { uuid: req.query.blogUuid }
        });
        
        if (blog) {
          console.log('Blog encontrado por blogUuid para menú:', blog.name);
        }
      }
    }
    
    // Si no se encontró el blog, intentar usar el blog con ID 1 como fallback
    if (!blog) {
      console.log('No se encontró el blog para menú, intentando usar el blog con ID 1 como fallback');
      blog = await prisma.blog.findUnique({
        where: { id: 1 }
      });
    }
    
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    
    console.log('Blog encontrado para menú:', blog.name, 'ID:', blog.id);
    
    // Obtener el menú del blog
    const menuItems = await prisma.menuItem.findMany({
      where: { blogId: blog.id },
      orderBy: { order: 'asc' }
    });
    
    console.log(`Encontrados ${menuItems.length} items de menú para el blog ${blog.name}`);
    res.json(menuItems);
  } catch (error) {
    console.error('Error al obtener menú público:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
