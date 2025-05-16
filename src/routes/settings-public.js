import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = express.Router();

// Endpoint público para obtener la configuración (para el frontend público)
router.get('/', async (req, res) => {
  try {
    // Obtener el subdominio y dominio de la solicitud
    const host = req.headers.host || '';
    console.log('Host completo para configuración:', host);
    
    // Extraer subdominio y dominio de múltiples fuentes
    let subdomain = '';
    let domain = '';
    
    // Priorizar el header X-Taita-Subdomain si está presente
    if (req.headers['x-taita-subdomain']) {
      subdomain = req.headers['x-taita-subdomain'];
      console.log('Usando subdominio del header X-Taita-Subdomain para configuración:', subdomain);
    }
    // Si no hay header, intentar obtenerlo de los query params
    else if (req.query.subdomain) {
      subdomain = req.query.subdomain;
      console.log('Usando subdominio de query param para configuración:', subdomain);
    }
    // Como última opción, intentar extraerlo del host
    else if (host) {
      // Manejar casos especiales como localhost o IP
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        subdomain = 'demo'; // Usar un subdominio por defecto para desarrollo local
        console.log('Desarrollo local, usando subdominio por defecto para configuración:', subdomain);
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
      console.log('Extraído subdominio del host para configuración:', subdomain);
    }
    
    // Si aún no tenemos subdominio, usar 'demo' como último recurso
    if (!subdomain) {
      subdomain = 'demo';
      console.log('Usando subdominio por defecto (demo) para configuración');
    }
    
    console.log('Subdominio extraído para configuración:', subdomain);
    console.log('Dominio extraído para configuración:', domain);
    
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
          console.log('Blog encontrado por subdominio y dominio para configuración:', blog.name);
        }
      }
      
      // Si no se encuentra, buscar solo por subdominio
      if (!blog) {
        blog = await prisma.blog.findFirst({
          where: { subdomain }
        });
        
        if (blog) {
          console.log('Blog encontrado solo por subdominio para configuración:', blog.name);
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
          console.log('Blog encontrado por blogId para configuración:', blog.name);
        }
      } else if (req.query.blogUuid) {
        // Si se proporciona un UUID de blog en la consulta
        blog = await prisma.blog.findFirst({
          where: { uuid: req.query.blogUuid }
        });
        
        if (blog) {
          console.log('Blog encontrado por blogUuid para configuración:', blog.name);
        }
      }
    }
    
    // Si no se encontró el blog, intentar usar el blog con ID 1 como fallback
    if (!blog) {
      console.log('No se encontró el blog para configuración, intentando usar el blog con ID 1 como fallback');
      blog = await prisma.blog.findUnique({
        where: { id: 1 }
      });
    }
    
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    
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
