import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = express.Router();

// Endpoint público para obtener categorías (para el frontend público)
router.get('/', async (req, res) => {
  try {
    // Obtener el subdominio y dominio de la solicitud
    const host = req.headers.host || '';
    console.log('Host completo para categorías:', host);
    
    // Extraer subdominio y dominio de múltiples fuentes
    let subdomain = '';
    let domain = '';
    
    // Priorizar el header X-Taita-Subdomain si está presente
    if (req.headers['x-taita-subdomain']) {
      subdomain = req.headers['x-taita-subdomain'];
      console.log('Usando subdominio del header X-Taita-Subdomain para categorías:', subdomain);
    }
    // Si no hay header, intentar obtenerlo de los query params
    else if (req.query.subdomain) {
      subdomain = req.query.subdomain;
      console.log('Usando subdominio de query param para categorías:', subdomain);
    }
    // Como última opción, intentar extraerlo del host
    else if (host) {
      // Manejar casos especiales como localhost o IP
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        subdomain = 'demo'; // Usar un subdominio por defecto para desarrollo local
        console.log('Desarrollo local, usando subdominio por defecto para categorías:', subdomain);
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
          subdomain = 'default';
        } else if (parts[0] === 'www' && parts.length >= 3) {
          // Formato: www.domain.tld
          domain = parts.slice(1).join('.');
          subdomain = 'default';
        }
      }
      console.log('Extraído subdominio del host para categorías:', subdomain);
    }
    
    // Si aún no tenemos subdominio, usar 'demo' como último recurso
    if (!subdomain) {
      subdomain = 'demo';
      console.log('Usando subdominio por defecto (demo) para categorías');
    }
    
    console.log('Subdominio extraído para categorías:', subdomain);
    console.log('Dominio extraído para categorías:', domain);
    
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
          console.log('Blog encontrado por subdominio y dominio para categorías:', blog.name);
        }
      }
      
      // Si no se encuentra, buscar solo por subdominio
      if (!blog) {
        blog = await prisma.blog.findFirst({
          where: { subdomain }
        });
        
        if (blog) {
          console.log('Blog encontrado solo por subdominio para categorías:', blog.name);
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
          console.log('Blog encontrado por blogId para categorías:', blog.name);
        }
      } else if (req.query.blogUuid) {
        // Si se proporciona un UUID de blog en la consulta
        blog = await prisma.blog.findFirst({
          where: { uuid: req.query.blogUuid }
        });
        
        if (blog) {
          console.log('Blog encontrado por blogUuid para categorías:', blog.name);
        }
      }
    }
    
    // Si no se encontró el blog, intentar usar el blog con ID 1 como fallback
    if (!blog) {
      console.log('No se encontró el blog para categorías, intentando usar el blog con ID 1 como fallback');
      blog = await prisma.blog.findUnique({
        where: { id: 1 }
      });
    }
    
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    
    console.log('Blog encontrado para categorías:', blog.name, 'ID:', blog.id);
    
    // Obtener las categorías del blog con conteo de posts
    const categories = await prisma.category.findMany({
      where: { blogId: blog.id },
      include: {
        _count: {
          select: { posts: { where: { status: 'PUBLISHED' } } }
        }
      }
    });
    
    // Formatear la respuesta para incluir el conteo de posts
    // Transformar los resultados para incluir el conteo de posts
    const categoriesWithPostCount = categories.map(category => ({
      ...category,
      postCount: category._count.posts
    }));
    
    // Eliminar el campo _count que ya no necesitamos
    categoriesWithPostCount.forEach(category => {
      delete category._count;
    });
    
    console.log(`Encontradas ${categories.length} categorías para el blog ${blog.name}`);
    res.json(categoriesWithPostCount);
  } catch (error) {
    console.error('Error al obtener categorías públicas:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
