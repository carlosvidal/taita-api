import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = express.Router();

// Get all pages
import { authenticateUser } from "../middleware/authMiddleware.js";

router.get("/", authenticateUser, async (req, res) => {
  try {
    let pages;
    if (req.user.role === "SUPER_ADMIN") {
      pages = await prisma.page.findMany({
        include: {
          author: {
            select: {
              id: true,
              uuid: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    } else {
      const blog = await prisma.blog.findUnique({
        where: { adminId: req.user.id },
        select: { id: true },
      });
      if (!blog) return res.json([]);
      pages = await prisma.page.findMany({
        where: { blogId: blog.id },
        include: {
          author: {
            select: {
              id: true,
              uuid: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    }
    res.json(pages);
  } catch (error) {
    console.error("Error al obtener páginas:", error);
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
    const existingPage = await prisma.page.findUnique({
      where: { slug },
      select: { id: true, uuid: true },
    });

    res.json({ exists: !!existingPage, page: existingPage });
  } catch (error) {
    console.error("Error al verificar slug:", error);
    res.status(500).json({ error: error.message });
  }
});

// Count pages
router.get("/count", async (req, res) => {
  try {
    const count = await prisma.page.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single page by UUID
router.get("/uuid/:uuid", async (req, res) => {
  try {
    console.log("Buscando página por UUID:", req.params.uuid);
    const page = await prisma.page.findUnique({
      where: { uuid: req.params.uuid },
      include: { author: true },
    });

    if (!page) return res.status(404).json({ error: "Page not found" });

    // Registrar la información de la imagen para depuración
    console.log("Información de imagen de la página:", {
      id: page.id,
      uuid: page.uuid,
      image: page.image,
      imageId: page.imageId,
    });

    res.json(page);
  } catch (error) {
    console.error("Error al buscar página por UUID:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single page by slug
router.get("/:slug", async (req, res) => {
  try {
    // Verificar si el slug podría ser un UUID
    if (req.params.slug && req.params.slug.includes("-")) {
      console.log("El slug parece ser un UUID, redirigiendo...");
      const page = await prisma.page.findUnique({
        where: { uuid: req.params.slug },
        include: { author: true },
      });
      if (page) {
        return res.json(page);
      }
    }

    const page = await prisma.page.findUnique({
      where: { slug: req.params.slug },
    });
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create page
router.post("/", async (req, res) => {
  try {
    const { title, slug, content, authorId, excerpt, status, image, imageId, blogId } =
      req.body; // Agregar blogId
    console.log("Creando nueva página:", req.body);

    // Convertir el status a mayúsculas para que coincida con el enum PublishStatus
    const statusValue = status ? status.toUpperCase() : "DRAFT";

    // Preparar los datos para la creación
    const pageData = {
      title,
      slug,
      content,
      excerpt,
      status: statusValue,
      author: { connect: { id: authorId } },
      blog: { connect: { id: blogId } }, // Relación correcta con blog
    };


    // Manejar la imagen si se proporciona
    if (image) {
      console.log("Incluyendo imagen en la nueva página:", image);
      pageData.image = image;

      if (imageId) {
        pageData.imageId = parseInt(imageId);
        console.log("ID de imagen convertido a entero:", pageData.imageId);
      }
    }

    console.log("Datos finales para crear página:", pageData);

    const page = await prisma.page.create({
      data: pageData,
    });

    console.log("Página creada exitosamente:", {
      id: page.id,
      uuid: page.uuid,
      title: page.title,
      image: page.image,
      imageId: page.imageId,
    });

    res.json(page);
  } catch (error) {
    console.error("Error completo al crear página:", error);
    res.status(400).json({ 
      error: error.message,
      prisma: error // Devuelve el objeto completo para depuración
    });
  }
});

// Update page by UUID - handler function
const updatePageByUuid = async (req, res) => {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      status,
      authorId,
      image,
      imageId,
      removeImage,
    } = req.body;
    console.log("Actualizando página por UUID:", req.params.uuid, req.body);

    // Convertir el status a mayúsculas para que coincida con el enum PublishStatus
    const statusValue = status ? status.toUpperCase() : undefined;

    // Preparar los datos para la actualización (solo incluir campos definidos)
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (content !== undefined) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (statusValue !== undefined) updateData.status = statusValue;
    if (authorId) updateData.author = { connect: { id: authorId } };

    // Manejar la imagen
    if (removeImage) {
      console.log("Eliminando imagen de la página");
      updateData.image = null;
      updateData.imageId = null;
    } else {
      if (image !== undefined) {
        console.log("Actualizando imagen de la página:", image);
        updateData.image = image;
      }
      if (imageId !== undefined) {
        updateData.imageId = imageId ? parseInt(imageId) : null;
        console.log("ID de imagen convertido a entero:", updateData.imageId);
      }
    }

    console.log("Datos finales para actualizar:", updateData);

    const page = await prisma.page.update({
      where: { uuid: req.params.uuid },
      data: updateData,
    });

    // Verificar que la actualización se haya realizado correctamente
    console.log("Página actualizada exitosamente:", {
      id: page.id,
      uuid: page.uuid,
      title: page.title,
      image: page.image,
      imageId: page.imageId,
    });

    res.json(page);
  } catch (error) {
    console.error("Error al actualizar página por UUID:", error);
    res.status(400).json({ error: error.message });
  }
};

// Update page by UUID (PUT and PATCH)
router.put("/uuid/:uuid", updatePageByUuid);
router.patch("/uuid/:uuid", updatePageByUuid);

// Update page by ID (para compatibilidad)
router.put("/:id", async (req, res) => {
  try {
    const { title, slug, content, excerpt, status } = req.body;

    // Convertir el status a mayúsculas para que coincida con el enum PublishStatus
    const statusValue = status ? status.toUpperCase() : "DRAFT";

    // Verificar si el ID parece ser un UUID (contiene guiones)
    if (req.params.id.includes("-")) {
      // Si es un UUID, redirigir a la ruta de UUID
      console.log("El ID parece ser un UUID, redirigiendo...");
      const page = await prisma.page.update({
        where: { uuid: req.params.id },
        data: { title, slug, content, excerpt, status: statusValue },
      });
      return res.json(page);
    }

    // Si no es un UUID, procesar como ID numérico
    const page = await prisma.page.update({
      where: { id: parseInt(req.params.id) },
      data: { title, slug, content, excerpt, status: statusValue },
    });
    res.json(page);
  } catch (error) {
    console.error("Error al actualizar página:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete page by UUID
router.delete("/uuid/:uuid", async (req, res) => {
  try {
    console.log("Eliminando página por UUID:", req.params.uuid);
    await prisma.page.delete({
      where: { uuid: req.params.uuid },
    });
    res.json({ message: "Page deleted successfully" });
  } catch (error) {
    console.error("Error al eliminar página por UUID:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete page by ID (para compatibilidad)
router.delete("/:id", async (req, res) => {
  try {
    // Verificar si el ID parece ser un UUID (contiene guiones)
    if (req.params.id.includes("-")) {
      // Si es un UUID, redirigir a la ruta de UUID
      console.log("El ID parece ser un UUID, redirigiendo...");
      await prisma.page.delete({
        where: { uuid: req.params.id },
      });
      return res.json({ message: "Page deleted successfully" });
    }

    // Si no es un UUID, procesar como ID numérico
    await prisma.page.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Page deleted successfully" });
  } catch (error) {
    console.error("Error al eliminar página:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
