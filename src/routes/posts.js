import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = express.Router();

// Get all posts
import { authenticateUser } from '../middleware/authMiddleware.js';

router.get("/", authenticateUser, async (req, res) => {
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
          }
        },
        orderBy: { updatedAt: "desc" },
      });
    } else {
      // Otros usuarios solo ven los posts de su blog
      // Buscar el blog asociado al usuario
      const blog = await prisma.blog.findUnique({
        where: { adminId: req.user.id },
        select: { id: true }
      });
      if (!blog) {
        return res.json([]); // Usuario sin blog propio
      }
      posts = await prisma.post.findMany({
        where: { blogId: blog.id },
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
        },
        orderBy: { updatedAt: "desc" },
      });
    }
    res.json(posts);
  } catch (error) {
    console.error('Error al obtener posts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Count posts
router.get("/count", async (req, res) => {
  try {
    const count = await prisma.post.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if a slug is already in use
router.get("/check-slug", async (req, res) => {
  try {
    const { slug } = req.query;
    
    if (!slug) {
      return res.status(400).json({ error: "Slug parameter is required" });
    }
    
    // Verificar si el slug ya existe en la base de datos
    const existingPost = await prisma.post.findUnique({
      where: { slug },
      select: { id: true, uuid: true }
    });
    
    res.json({ exists: !!existingPost, post: existingPost });
  } catch (error) {
    console.error("Error al verificar slug:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single post by UUID
router.get("/uuid/:uuid", async (req, res) => {
  try {
    console.log("Buscando post por UUID:", req.params.uuid);
    const post = await prisma.post.findUnique({
      where: { uuid: req.params.uuid },
      include: { category: true, author: true },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (error) {
    console.error("Error al buscar post por UUID:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single post by ID or UUID
router.get("/:id", async (req, res) => {
  try {
    // Verificar si el ID podría ser un UUID
    if (req.params.id && req.params.id.includes('-')) {
      console.log("El ID parece ser un UUID, buscando por UUID...");
      const post = await prisma.post.findUnique({
        where: { uuid: req.params.id },
        include: { category: true, author: true },
      });
      if (post) {
        return res.json(post);
      }
    }
    
    // Intentar buscar por ID numérico
    // Primero intentamos buscar por UUID si el ID contiene guiones (característica de UUID)
    if (req.params.id.includes('-')) {
      try {
        const postByUuid = await prisma.post.findUnique({
          where: { uuid: req.params.id },
          include: { category: true, author: true },
        });
        if (postByUuid) {
          return res.json(postByUuid);
        }
      } catch (uuidError) {
        console.log("Error al buscar por UUID:", uuidError);
      }
    } else {
      // Si no es un UUID, intentamos buscar por ID numérico
      try {
        const postById = await prisma.post.findUnique({
          where: { id: parseInt(req.params.id) },
          include: { category: true, author: true },
        });
        if (postById) {
          return res.json(postById);
        }
      } catch (parseError) {
        console.log("No se pudo parsear el ID como número");
      }
    }
    
    // Si llegamos aquí, no se encontró el post
    return res.status(404).json({ error: "Post not found" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create post
router.post("/", async (req, res) => {
  try {
    const { title, content, slug, categoryId, authorId, excerpt, status, image, imageId, thumbnail } = req.body;
    console.log("Creando nuevo post:", req.body);
    
    // Convertir el status a mayúsculas para que coincida con el enum PublishStatus
    const statusValue = status ? status.toUpperCase() : 'DRAFT';
    
    // Preparar los datos para la creación
    const postData = {
      title,
      content,
      slug,
      excerpt: excerpt || "",
      status: statusValue,
      author: { connect: { id: authorId } }
    };
    
    // Manejar la categoría si se proporciona
    if (categoryId) {
      try {
        const categoryIdInt = parseInt(categoryId);
        if (!isNaN(categoryIdInt)) {
          postData.category = { connect: { id: categoryIdInt } };
          console.log(`Conectando post a categoría ID: ${categoryIdInt}`);
        } else {
          console.log(`ID de categoría no válido: ${categoryId}`);
        }
      } catch (error) {
        console.error(`Error al procesar ID de categoría: ${categoryId}`, error);
      }
    }
    
    // Manejar la imagen si se proporciona
    if (image) {
      console.log("Incluyendo imagen en el nuevo post:", image);
      postData.image = image;
      
      if (imageId) {
        postData.imageId = parseInt(imageId);
        console.log("ID de imagen convertido a entero:", postData.imageId);
      }
    }
    
    // Manejar la miniatura si se proporciona
    if (thumbnail) {
      postData.thumbnail = thumbnail;
    }
    
    console.log("Datos finales para crear post:", postData);
    
    const post = await prisma.post.create({
      data: postData,
      include: {
        category: true,
        author: true
      }
    });
    
    console.log("Post creado exitosamente:", {
      id: post.id,
      uuid: post.uuid,
      title: post.title,
      image: post.image,
      imageId: post.imageId
    });
    
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update post by UUID
router.put("/uuid/:uuid", async (req, res) => {
  try {
    const { title, content, slug, categoryId, authorId, excerpt, status, image, imageId, removeImage, thumbnail } = req.body;
    console.log("Actualizando post por UUID:", req.params.uuid);
    console.log("Datos recibidos:", req.body);
    
    // Primero, obtener el post actual para asegurarnos de no perder datos
    const existingPost = await prisma.post.findUnique({
      where: { uuid: req.params.uuid },
      include: {
        category: true,
        author: true
      }
    });
    
    if (!existingPost) {
      return res.status(404).json({ error: "Post no encontrado" });
    }
    
    console.log("Post existente:", {
      id: existingPost.id,
      uuid: existingPost.uuid,
      title: existingPost.title,
      categoryId: existingPost.category?.id,
      authorId: existingPost.author?.id,
      image: existingPost.image,
      imageId: existingPost.imageId
    });
    
    // Preparar los datos para la actualización, manteniendo los valores existentes si no se proporcionan nuevos
    const updateData = {};
    
    // Actualizar campos básicos solo si se proporcionan
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (slug !== undefined) updateData.slug = slug;
    if (excerpt !== undefined) updateData.excerpt = excerpt || "";
    
    // Manejar el status
    if (status !== undefined) {
      // Convertir el status a mayúsculas para que coincida con el enum PublishStatus
      updateData.status = status.toUpperCase();
    }
    
    // Manejar la relación del autor si se proporciona
    if (authorId) {
      updateData.author = { connect: { id: parseInt(authorId) } };
    }
    
    // Manejar la relación de la categoría si se proporciona
    if (categoryId) {
      try {
        const categoryIdInt = parseInt(categoryId);
        if (!isNaN(categoryIdInt)) {
          updateData.category = { connect: { id: categoryIdInt } };
          console.log(`Conectando post a categoría ID: ${categoryIdInt}`);
        } else {
          console.log(`ID de categoría no válido: ${categoryId}`);
        }
      } catch (error) {
        console.error(`Error al procesar ID de categoría: ${categoryId}`, error);
      }
    }
    
    // Manejar la imagen
    if (image !== undefined) {
      console.log("Actualizando imagen del post:", image);
      updateData.image = image;
      
      // Ahora el modelo Post tiene campo imageId, igual que Page
      if (imageId) {
        try {
          updateData.imageId = parseInt(imageId);
          console.log("ID de imagen convertido a entero:", updateData.imageId);
        } catch (error) {
          console.error("Error al convertir imageId a entero:", error);
        }
      }
    } else if (removeImage) {
      console.log("Eliminando imagen del post");
      updateData.image = null;
      updateData.imageId = null;
    }
    
    // Manejar la miniatura si se proporciona
    if (thumbnail !== undefined) {
      updateData.thumbnail = thumbnail;
    }
    
    console.log("Datos finales para actualizar:", JSON.stringify(updateData, null, 2));
    
    const post = await prisma.post.update({
      where: { uuid: req.params.uuid },
      data: updateData,
      include: {
        category: true,
        author: true
      }
    });
    
    console.log("Post actualizado exitosamente:", {
      id: post.id,
      uuid: post.uuid,
      title: post.title,
      image: post.image,
      imageId: post.imageId,
      categoryId: post.category?.id
    });
    
    res.json(post);
  } catch (error) {
    console.error("Error al actualizar post por UUID:", error);
    console.error("Detalles del error:", {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    
    // Proporcionar un mensaje de error más detallado
    let errorMessage = error.message;
    if (error.meta && error.meta.field_name) {
      errorMessage = `Error en el campo ${error.meta.field_name}: ${error.message}`;
    }
    
    res.status(400).json({ 
      error: errorMessage,
      details: error.meta,
      code: error.code
    });
  }
});

// Update post by ID (para compatibilidad)
router.put("/:id", async (req, res) => {
  try {
    // Verificar si el ID parece ser un UUID (contiene guiones)
    if (req.params.id.includes('-')) {
      // Si es un UUID, redirigir a la ruta de UUID
      const { title, content, slug, categoryId, image, thumbnail } = req.body;
      const post = await prisma.post.update({
        where: { uuid: req.params.id },
        data: {
          title,
          content,
          slug,
          categoryId: parseInt(categoryId),
          image,
          thumbnail,
        },
      });
      return res.json(post);
    }
    
    // Si no es un UUID, procesar como ID numérico
    const { title, content, slug, categoryId, image, thumbnail } = req.body;
    const post = await prisma.post.update({
      where: { id: parseInt(req.params.id) },
      data: {
        title,
        content,
        slug,
        categoryId: parseInt(categoryId),
        image,
        thumbnail,
      },
    });
    res.json(post);
  } catch (error) {
    console.error("Error al actualizar post:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete post by UUID
router.delete("/uuid/:uuid", async (req, res) => {
  try {
    await prisma.post.delete({
      where: { uuid: req.params.uuid },
    });
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error al eliminar post por UUID:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete post by ID (para compatibilidad)
router.delete("/:id", async (req, res) => {
  try {
    // Verificar si el ID parece ser un UUID (contiene guiones)
    if (req.params.id.includes('-')) {
      // Si es un UUID, redirigir a la ruta de UUID
      await prisma.post.delete({
        where: { uuid: req.params.id },
      });
      return res.json({ message: "Post deleted successfully" });
    }
    
    // Si no es un UUID, procesar como ID numérico
    await prisma.post.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error al eliminar post:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
