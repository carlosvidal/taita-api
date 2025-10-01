import express from 'express'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const router = express.Router()

// Get all tags
import { authenticateUser } from '../middleware/authMiddleware.js';

router.get('/', authenticateUser, async (req, res) => {
  try {
    let tags;
    let blogId = null;

    // Si se proporciona blogId en query params, usarlo
    if (req.query.blogId) {
      blogId = parseInt(req.query.blogId);
    } else if (req.user.role !== 'SUPER_ADMIN') {
      // Si no es SUPER_ADMIN, buscar su blog
      const blog = await prisma.blog.findUnique({ where: { adminId: req.user.id }, select: { id: true } });
      if (!blog) return res.json([]);
      blogId = blog.id;
    }

    // Si tenemos blogId, filtrar por ese blog
    if (blogId) {
      tags = await prisma.tag.findMany({
        where: { blogId: blogId },
        include: {
          _count: {
            select: { posts: true }
          }
        },
        orderBy: { name: 'asc' }
      });
    } else {
      // SUPER_ADMIN sin blogId específico - devolver todas
      tags = await prisma.tag.findMany({
        include: {
          _count: {
            select: { posts: true }
          }
        },
        orderBy: { name: 'asc' }
      });
    }

    // Mapear para incluir postCount en el nivel raíz
    const tagsWithCount = tags.map(tag => ({
      ...tag,
      postCount: tag._count.posts
    }));

    res.json(tagsWithCount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single tag
router.get('/:id', async (req, res) => {
  try {
    const tag = await prisma.tag.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        _count: {
          select: { posts: true }
        }
      }
    });
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    res.json(tag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create tag
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { name, slug, blogId } = req.body;

    if (!blogId) {
      return res.status(400).json({ error: "blogId es requerido" });
    }

    // Verificar que el blog exista
    const blog = await prisma.blog.findUnique({
      where: { id: parseInt(blogId) }
    });

    if (!blog) {
      return res.status(400).json({ error: "El blog especificado no existe" });
    }

    // Verificar que no exista ya un tag con el mismo nombre o slug en este blog
    const existingTag = await prisma.tag.findFirst({
      where: {
        blogId: parseInt(blogId),
        OR: [
          { name: name },
          { slug: slug }
        ]
      }
    });

    if (existingTag) {
      return res.status(400).json({
        error: "Ya existe un tag con ese nombre o slug en este blog"
      });
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        slug,
        blogId: parseInt(blogId)
      }
    });

    res.status(201).json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update tag
const updateTagById = async (req, res) => {
  try {
    const { name, slug } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;

    const tag = await prisma.tag.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });

    res.json(tag);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tag not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

router.put('/:id', authenticateUser, updateTagById);
router.patch('/:id', authenticateUser, updateTagById);

// Delete tag
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    await prisma.tag.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tag not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router
