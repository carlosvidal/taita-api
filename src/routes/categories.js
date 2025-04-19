import express from 'express'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const router = express.Router()

// Get all categories
import { authenticateUser } from '../middleware/authMiddleware.js';

router.get('/', authenticateUser, async (req, res) => {
  try {
    let categories;
    if (req.user.role === 'SUPER_ADMIN') {
      categories = await prisma.category.findMany({
        include: { posts: true }
      });
    } else {
      // Buscar blog del usuario
      const blog = await prisma.blog.findUnique({ where: { adminId: req.user.id }, select: { id: true } });
      if (!blog) return res.json([]);
      categories = await prisma.category.findMany({
        where: { blogId: blog.id },
        include: { posts: true }
      });
    }
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Count categories
router.get('/count', async (req, res) => {
  try {
    const count = await prisma.category.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single category
router.get('/:id', async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { posts: true }
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create category
router.post('/', async (req, res) => {
  try {
    const { name, slug } = req.body;
    const category = await prisma.category.create({
      data: { name, slug }
    });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  try {
    const { name, slug } = req.body;
    const category = await prisma.category.update({
      where: { id: parseInt(req.params.id) },
      data: { name, slug }
    });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    await prisma.category.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router  // Make sure this is the last line