import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateUser } from '../middleware/authMiddleware.js';

const prisma = new PrismaClient();
const router = express.Router();

// Endpoint protegido para el CMS
router.get("/protected", authenticateUser, async (req, res) => {
  try {
    let posts;
    if (req.user.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN puede ver todos los posts
      posts = await prisma.post.findMany({
        include: {
          category: true,
          author: {
            select: {
              id: true,
              uuid: true,
              name: true,
              email: true
            }
          },
          blog: {
            select: {
              id: true,
              uuid: true,
              name: true,
              subdomain: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });
    } else {
      // Usuarios normales solo ven posts de sus blogs
      const userBlogs = await prisma.blog.findMany({
        where: { adminId: req.user.id }
      });
      
      const blogIds = userBlogs.map(blog => blog.id);
      
      posts = await prisma.post.findMany({
        where: {
          blogId: { in: blogIds }
        },
        include: {
          category: true,
          author: {
            select: {
              id: true,
              uuid: true,
              name: true,
              email: true
            }
          },
          blog: {
            select: {
              id: true,
              uuid: true,
              name: true,
              subdomain: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });
    }
    
    res.json(posts);
  } catch (error) {
    console.error('Error al obtener posts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get post by ID
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({
      where: { id: Number(id) },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            uuid: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error al obtener post por ID:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get post by UUID
router.get("/uuid/:uuid", authenticateUser, async (req, res) => {
  try {
    const { uuid } = req.params;
    const post = await prisma.post.findFirst({
      where: { uuid },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            uuid: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error al obtener post por UUID:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create post
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { title, content, excerpt, slug, status, categoryId, blogId } = req.body;
    
    // Validar que el blog exista
    const blog = await prisma.blog.findUnique({
      where: { id: Number(blogId) }
    });
    
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    
    // Validar que la categoría exista
    const category = await prisma.category.findUnique({
      where: { id: Number(categoryId) }
    });
    
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    // Crear el post
    const post = await prisma.post.create({
      data: {
        title,
        content,
        excerpt,
        slug,
        status,
        blogId: Number(blogId),
        categoryId: Number(categoryId),
        authorId: req.user.id,
        publishedAt: status === 'PUBLISHED' ? new Date() : null
      }
    });
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Error al crear post:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update post
router.patch("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, slug, status, categoryId } = req.body;
    
    // Verificar si el post existe
    const existingPost = await prisma.post.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    // Actualizar el post
    const updatedPost = await prisma.post.update({
      where: { id: Number(id) },
      data: {
        title,
        content,
        excerpt,
        slug,
        status,
        categoryId: Number(categoryId),
        publishedAt: status === 'PUBLISHED' && !existingPost.publishedAt ? new Date() : existingPost.publishedAt
      }
    });
    
    res.json(updatedPost);
  } catch (error) {
    console.error('Error al actualizar post:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete post
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el post existe
    const existingPost = await prisma.post.findUnique({
      where: { id: Number(id) }
    });
    
    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    // Eliminar el post
    await prisma.post.delete({
      where: { id: Number(id) }
    });
    
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error('Error al eliminar post:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
