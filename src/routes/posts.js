import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateUser } from "../middleware/authMiddleware.js";

const prisma = new PrismaClient();
const router = express.Router();

// Endpoint protegido para el CMS
router.get("/", authenticateUser, async (req, res) => {
  try {
    const { blogId } = req.query;

    // Si no se proporciona blogId, devolver array vacío
    if (!blogId) {
      console.log("No se proporcionó blogId, devolviendo array vacío");
      return res.json([]);
    }

    const parsedBlogId = parseInt(blogId);
    if (isNaN(parsedBlogId)) {
      console.log("blogId no es un número válido:", blogId);
      return res.status(400).json({ error: "blogId debe ser un número" });
    }

    // Crear whereClause solo con el blogId
    const whereClause = { blogId: parsedBlogId };
    console.log("Filtrando por blogId:", parsedBlogId);

    // Verificar que el blog exista
    const blog = await prisma.blog.findUnique({
      where: { id: parsedBlogId },
      select: { id: true, adminId: true },
    });

    if (!blog) {
      console.log(`Blog con ID ${parsedBlogId} no encontrado`);
      return res.status(404).json({ error: "Blog no encontrado" });
    }

    // Verificar permisos
    if (req.user.role !== "SUPER_ADMIN") {
      // Para usuarios normales, verificar que sean dueños del blog
      if (blog.adminId !== req.user.id) {
        console.log(
          `Usuario ${req.user.id} no tiene permisos para ver los posts del blog ${parsedBlogId}`
        );
        return res
          .status(403)
          .json({
            error: "No tienes permisos para ver los posts de este blog",
          });
      }
    } else {
      console.log(
        "Usuario es SUPER_ADMIN, mostrando posts del blog:",
        parsedBlogId
      );
    }

    console.log(
      "Obteniendo posts con whereClause:",
      JSON.stringify(whereClause, null, 2)
    );

    const posts = await prisma.post.findMany({
      where: whereClause,
      include: {
        category: true,
        author: {
          select: {
            id: true,
            uuid: true,
            name: true,
            email: true,
          },
        },
        blog: {
          select: {
            id: true,
            uuid: true,
            name: true,
            subdomain: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(
      `Se encontraron ${posts.length} posts para el blog ${parsedBlogId}`
    );
    // El código de usuarios normales ya está manejado en la verificación de permisos anterior

    res.json(posts);
  } catch (error) {
    console.error("Error al obtener posts:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint público para obtener posts
router.get("/public", async (req, res) => {
  try {
    const host = req.headers.host || "";

    console.log("Endpoint /public");
    console.log("Host recibido:", host);

    // Extraer el subdominio del host
    let subdomain;
    if (host.includes(".")) {
      // Si es un dominio completo (ej: blog.example.com)
      subdomain = host.split(".")[0];
    } else if (host.includes(":")) {
      // Si es localhost con puerto (ej: localhost:3000)
      subdomain = "demo"; // Usar demo como subdominio por defecto en desarrollo
    } else {
      // Caso por defecto
      subdomain = host;
    }

    console.log("Subdominio extraído:", subdomain);

    // Buscar el blog por subdominio
    const blog = await prisma.blog.findFirst({
      where: {
        subdomain: subdomain,
      },
    });

    console.log("Blog encontrado:", blog);

    if (!blog) {
      console.log("Blog no encontrado para el subdominio:", subdomain);
      // Si no se encuentra un blog específico, intentar obtener cualquier blog
      const anyBlog = await prisma.blog.findFirst();
      if (!anyBlog) {
        return res.status(404).json({ error: "No blogs found in the system" });
      }
      console.log("Usando blog alternativo:", anyBlog);
      // Usar el primer blog disponible
      const posts = await prisma.post.findMany({
        where: {
          blogId: anyBlog.id,
          status: "PUBLISHED",
        },
        include: {
          category: true,
          author: {
            select: {
              id: true,
              name: true,
              bio: true,
              avatar: true,
            },
          },
        },
        orderBy: { publishedAt: "desc" },
      });

      console.log("Posts encontrados con blog alternativo:", posts.length);
      return res.json(posts);
    }

    // Buscar posts con el blog encontrado
    const posts = await prisma.post.findMany({
      where: {
        blogId: blog.id,
        status: "PUBLISHED",
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            bio: true,
            avatar: true,
          },
        },
      },
      orderBy: { publishedAt: "desc" },
    });

    console.log("Posts encontrados:", posts.length);
    res.json(posts);
  } catch (error) {
    console.error("Error al obtener posts públicos:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint público para obtener post por slug
router.get("/public/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const host = req.headers.host || "";

    console.log("Endpoint /public/slug/:slug");
    console.log("Slug recibido:", slug);
    console.log("Host recibido:", host);

    // Extraer el subdominio del host
    let subdomain;
    if (host.includes(".")) {
      // Si es un dominio completo (ej: blog.example.com)
      subdomain = host.split(".")[0];
    } else if (host.includes(":")) {
      // Si es localhost con puerto (ej: localhost:3000)
      subdomain = "demo"; // Usar demo como subdominio por defecto en desarrollo
    } else {
      // Caso por defecto
      subdomain = host;
    }

    console.log("Subdominio extraído:", subdomain);

    // Buscar el blog por subdominio
    const blog = await prisma.blog.findFirst({
      where: {
        subdomain: subdomain,
      },
    });

    console.log("Blog encontrado:", blog);

    if (!blog) {
      console.log("Blog no encontrado para el subdominio:", subdomain);
      // Si no se encuentra un blog específico, intentar obtener cualquier blog
      const anyBlog = await prisma.blog.findFirst();
      if (!anyBlog) {
        return res.status(404).json({ error: "No blogs found in the system" });
      }
      console.log("Usando blog alternativo:", anyBlog);
      // Usar el primer blog disponible
      const posts = await prisma.post.findMany({
        where: {
          blogId: anyBlog.id,
          slug: slug,
          status: "PUBLISHED",
        },
        include: {
          category: true,
          author: {
            select: {
              id: true,
              name: true,
              bio: true,
              avatar: true,
            },
          },
        },
      });

      console.log("Posts encontrados con blog alternativo:", posts.length);

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
        status: "PUBLISHED",
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            bio: true,
            avatar: true,
          },
        },
      },
    });

    console.log("Posts encontrados:", posts.length);

    if (!posts || posts.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(posts);
  } catch (error) {
    console.error("Error al obtener post por slug:", error);
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
            email: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error al obtener post por ID:", error);
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
            email: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error al obtener post por UUID:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create post
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { title, content, excerpt, slug, status, categoryId, blogId, image, imageId } =
      req.body;

    // Validar que el blog exista
    const blog = await prisma.blog.findUnique({
      where: { id: Number(blogId) },
    });

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // Validar que la categoría exista
    const category = await prisma.category.findUnique({
      where: { id: Number(categoryId) },
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
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        image: image || null,
        imageId: imageId ? Number(imageId) : null,
      },
    });

    res.status(201).json(post);
  } catch (error) {
    console.error("Error al crear post:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update post
router.patch("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, slug, status, categoryId, image, imageId, removeImage } = req.body;

    // Verificar si el post existe
    const existingPost = await prisma.post.findUnique({
      where: { id: Number(id) },
    });

    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Preparar datos para actualizar
    const updateData = {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(excerpt !== undefined && { excerpt }),
      ...(slug !== undefined && { slug }),
      ...(status !== undefined && { status }),
      ...(categoryId !== undefined && { categoryId: Number(categoryId) }),
      ...(status === "PUBLISHED" && !existingPost.publishedAt && { publishedAt: new Date() }),
    };

    // Manejar imagen
    if (removeImage) {
      updateData.image = null;
      updateData.imageId = null;
    } else {
      if (image !== undefined) {
        updateData.image = image;
      }
      if (imageId !== undefined) {
        updateData.imageId = imageId ? Number(imageId) : null;
      }
    }

    // Actualizar el post
    const updatedPost = await prisma.post.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.json(updatedPost);
  } catch (error) {
    console.error("Error al actualizar post:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete post
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el post existe
    const existingPost = await prisma.post.findUnique({
      where: { id: Number(id) },
    });

    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Eliminar el post
    await prisma.post.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error al eliminar post:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
