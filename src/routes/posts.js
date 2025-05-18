import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateUser } from '../middleware/authMiddleware.js';

const prisma = new PrismaClient();
const router = express.Router();

// Endpoint protegido para el CMS
router.get("/", authenticateUser, async (req, res) => {
  try {
    const { blogId, includeDrafts } = req.query;
    let whereClause = {};
    
    // Si se proporciona blogId, filtrar por ese blog
    if (blogId) {
      const parsedBlogId = parseInt(blogId);
      whereClause.blogId = parsedBlogId;
      console.log('Filtrando por blogId:', parsedBlogId);
    }
    
    // Incluir borradores si se solicita
    if (includeDrafts !== 'true') {
      whereClause.status = 'PUBLISHED';
    }
    
    let posts;
    if (req.user.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN puede ver todos los posts (filtrados por blogId si se proporciona)
      console.log('Usuario es SUPER_ADMIN');
      
      // Si no se proporcionó blogId, mostrar todos los posts
      if (!blogId) {
        whereClause = {}; // Mostrar todos los posts sin filtrar por blog
      } else {
        // Si se proporcionó blogId, filtrar por ese blog
        whereClause = { blogId: parseInt(blogId) };
      }
      
      // Mantener el filtro de estado si corresponde
      if (includeDrafts !== 'true') {
        whereClause.status = 'PUBLISHED';
      }
      
      console.log('Where clause final para SUPER_ADMIN:', JSON.stringify(whereClause, null, 2));
      
      posts = await prisma.post.findMany({
        where: whereClause,
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
      console.log('Usuario NO es SUPER_ADMIN');
      
      // Obtener los blogs del usuario
      const userBlogs = await prisma.blog.findMany({
        where: { adminId: req.user.id },
        select: { id: true, name: true }
      });
      
      console.log('Blogs del usuario:', userBlogs);
      
      const blogIds = userBlogs.map(blog => blog.id);
      console.log('IDs de blogs del usuario:', blogIds);
      
      // Si no hay blogs, devolver array vacío
      if (blogIds.length === 0) {
        return res.json([]);
      }
      
      // Reiniciar el whereClause
      whereClause = {};
      
      // Si se proporcionó un blogId, verificar que el usuario tenga acceso a ese blog
      if (blogId) {
        const blogIdNum = parseInt(blogId);
        console.log(`Verificando acceso al blog ${blogIdNum}...`);
        
        if (!blogIds.includes(blogIdNum)) {
          console.error(`Usuario no tiene acceso al blog ${blogIdNum}`);
          return res.status(403).json({ error: 'No tienes acceso a este blog' });
        }
        // Si tiene acceso, filtrar solo por ese blog
        whereClause.blogId = blogIdNum;
        console.log(`Filtrando por blog específico: ${blogIdNum}`);
      } else {
        // Si no se proporcionó blogId, filtrar por todos los blogs del usuario
        whereClause.blogId = { in: blogIds };
        console.log(`Filtrando por múltiples blogs:`, blogIds);
      }
      
      // Asegurarse de mantener el filtro de estado
      if (includeDrafts !== 'true') {
        whereClause.status = 'PUBLISHED';
      }
      
      console.log('Ejecutando consulta final con whereClause:', JSON.stringify(whereClause, null, 2));
      
      posts = await prisma.post.findMany({
        where: whereClause,
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

// Endpoint público para obtener posts
router.get("/public", async (req, res) => {
  try {
    const host = req.headers.host || '';
    
    console.log('Endpoint /public');
    console.log('Host recibido:', host);
    
    // Extraer el subdominio del host
    let subdomain;
    if (host.includes('.')) {
      // Si es un dominio completo (ej: blog.example.com)
      subdomain = host.split('.')[0];
    } else if (host.includes(':')) {
      // Si es localhost con puerto (ej: localhost:3000)
      subdomain = 'demo'; // Usar demo como subdominio por defecto en desarrollo
    } else {
      // Caso por defecto
      subdomain = host;
    }
    
    console.log('Subdominio extraído:', subdomain);
    
    // Buscar el blog por subdominio
    const blog = await prisma.blog.findFirst({
      where: {
        subdomain: subdomain
      }
    });
    
    console.log('Blog encontrado:', blog);
    
    if (!blog) {
      console.log('Blog no encontrado para el subdominio:', subdomain);
      // Si no se encuentra un blog específico, intentar obtener cualquier blog
      const anyBlog = await prisma.blog.findFirst();
      if (!anyBlog) {
        return res.status(404).json({ error: "No blogs found in the system" });
      }
      console.log('Usando blog alternativo:', anyBlog);
      // Usar el primer blog disponible
      const posts = await prisma.post.findMany({
        where: {
          blogId: anyBlog.id,
          status: 'PUBLISHED'
        },
        include: {
          category: true,
          author: {
            select: {
              id: true,
              name: true,
              bio: true,
              avatar: true
            }
          }
        },
        orderBy: { publishedAt: "desc" }
      });
      
      console.log('Posts encontrados con blog alternativo:', posts.length);
      return res.json(posts);
    }
    
    // Buscar posts con el blog encontrado
    const posts = await prisma.post.findMany({
      where: {
        blogId: blog.id,
        status: 'PUBLISHED'
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            bio: true,
            avatar: true
          }
        }
      },
      orderBy: { publishedAt: "desc" }
    });
    
    console.log('Posts encontrados:', posts.length);
    res.json(posts);
  } catch (error) {
    console.error('Error al obtener posts públicos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint público para obtener post por slug
router.get("/public/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const host = req.headers.host || '';
    
    console.log('Endpoint /public/slug/:slug');
    console.log('Slug recibido:', slug);
    console.log('Host recibido:', host);
    
    // Extraer el subdominio del host
    let subdomain;
    if (host.includes('.')) {
      // Si es un dominio completo (ej: blog.example.com)
      subdomain = host.split('.')[0];
    } else if (host.includes(':')) {
      // Si es localhost con puerto (ej: localhost:3000)
      subdomain = 'demo'; // Usar demo como subdominio por defecto en desarrollo
    } else {
      // Caso por defecto
      subdomain = host;
    }
    
    console.log('Subdominio extraído:', subdomain);
    
    // Buscar el blog por subdominio
    const blog = await prisma.blog.findFirst({
      where: {
        subdomain: subdomain
      }
    });
    
    console.log('Blog encontrado:', blog);
    
    if (!blog) {
      console.log('Blog no encontrado para el subdominio:', subdomain);
      // Si no se encuentra un blog específico, intentar obtener cualquier blog
      const anyBlog = await prisma.blog.findFirst();
      if (!anyBlog) {
        return res.status(404).json({ error: "No blogs found in the system" });
      }
      console.log('Usando blog alternativo:', anyBlog);
      // Usar el primer blog disponible
      const posts = await prisma.post.findMany({
        where: {
          blogId: anyBlog.id,
          slug: slug,
          status: 'PUBLISHED'
        },
        include: {
          category: true,
          author: {
            select: {
              id: true,
              name: true,
              bio: true,
              avatar: true
            }
          }
        }
      });
      
      console.log('Posts encontrados con blog alternativo:', posts.length);
      
      if (!posts || posts.length === 0) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      return res.json(posts);
    }
    
    // Buscar posts con el blog encontrado
    const posts = await prisma.post.findMany({
      where: {
        blogId: blog.id,
        slug: slug,
        status: 'PUBLISHED'
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            bio: true,
            avatar: true
          }
        }
      }
    });
    
    console.log('Posts encontrados:', posts.length);
    
    if (!posts || posts.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    res.json(posts);
  } catch (error) {
    console.error('Error al obtener post por slug:', error);
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
