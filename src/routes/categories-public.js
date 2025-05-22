import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = express.Router();

// Endpoint público para obtener categorías (para el frontend público)
router.get('/', async (req, res) => {
  try {
    // Estandarización: obtener tenant desde query o header
    const tenant = req.query.tenant || req.headers['x-taita-tenant'];
    if (!tenant) {
      return res.status(400).json({ error: "El parámetro 'tenant' es requerido" });
    }
    // Buscar el blog correspondiente al tenant (por subdomain o domain)
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
    
    // Obtener las categorías del blog
    const categories = await prisma.category.findMany({
      where: { blogId: blog.id },
      include: {
        posts: {
          where: { status: 'PUBLISHED' },
          select: { id: true } // Solo necesitamos el ID para contar
        }
      }
    });
    
    // Formatear la respuesta para incluir el conteo de posts
    const categoriesWithPostCount = categories.map(category => ({
      id: category.id,
      uuid: category.uuid,
      name: category.name,
      slug: category.slug,
      postCount: category.posts.length // Contar los posts publicados
    }));
    
    console.log(`Encontradas ${categories.length} categorías para el blog ${blog.name}`);
    res.json(categoriesWithPostCount);
  } catch (error) {
    console.error('Error al obtener categorías públicas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint público para obtener una categoría por su slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Estandarización: obtener tenant desde query o header
    const tenant = req.query.tenant || req.headers['x-taita-tenant'];
    if (!tenant) {
      return res.status(400).json({ error: "El parámetro 'tenant' es requerido" });
    }
    // Buscar el blog correspondiente al tenant (por subdomain o domain)
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
    // Buscar la categoría por slug y blogId
    const category = await prisma.category.findFirst({
      where: {
        slug,
        blogId: blog.id
      },
      include: {
        posts: {
          where: { status: 'PUBLISHED' },
          select: { id: true }
        }
      }
    });
    
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    // Formatear la respuesta
    const response = {
      id: category.id,
      uuid: category.uuid,
      name: category.name,
      slug: category.slug,
      description: category.description,
      postCount: category.posts.length,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error al obtener la categoría:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
