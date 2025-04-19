import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = express.Router();

// Get all series
import { authenticateUser } from '../middleware/authMiddleware.js';

router.get("/", authenticateUser, async (req, res) => {
  try {
    let series;
    if (req.user.role === 'SUPER_ADMIN') {
      series = await prisma.series.findMany({
        include: { 
          author: {
            select: {
              id: true,
              uuid: true,
              name: true,
              email: true
            }
          },
          posts: {
            select: {
              id: true,
              uuid: true,
              title: true,
              slug: true,
              sequenceNumber: true
            },
            orderBy: {
              sequenceNumber: "asc"
            }
          }
        },
        orderBy: { updatedAt: "desc" },
      });
    } else {
      const blog = await prisma.blog.findUnique({ where: { adminId: req.user.id }, select: { id: true } });
      if (!blog) return res.json([]);
      series = await prisma.series.findMany({
        where: { blogId: blog.id },
        include: { 
          author: {
            select: {
              id: true,
              uuid: true,
              name: true,
              email: true
            }
          },
          posts: {
            select: {
              id: true,
              uuid: true,
              title: true,
              slug: true,
              sequenceNumber: true
            },
            orderBy: {
              sequenceNumber: "asc"
            }
          }
        },
        orderBy: { updatedAt: "desc" },
      });
    }
    res.json(series);
  } catch (error) {
    console.error('Error al obtener series:', error);
    res.status(500).json({ error: error.message });
  }
});

// Count series
router.get("/count", async (req, res) => {
  try {
    const count = await prisma.series.count();
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
    const existingSeries = await prisma.series.findUnique({
      where: { slug },
      select: { id: true, uuid: true }
    });
    
    res.json({ exists: !!existingSeries, series: existingSeries });
  } catch (error) {
    console.error("Error al verificar slug:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single series by UUID
router.get("/uuid/:uuid", async (req, res) => {
  try {
    console.log("Buscando serie por UUID:", req.params.uuid);
    const series = await prisma.series.findUnique({
      where: { uuid: req.params.uuid },
      include: { 
        author: true,
        posts: {
          include: {
            category: true
          },
          orderBy: {
            sequenceNumber: "asc"
          }
        }
      },
    });
    if (!series) return res.status(404).json({ error: "Series not found" });
    res.json(series);
  } catch (error) {
    console.error("Error al buscar serie por UUID:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single series by ID or UUID
router.get("/:id", async (req, res) => {
  try {
    // Verificar si el ID podría ser un UUID
    if (req.params.id && req.params.id.includes('-')) {
      console.log("El ID parece ser un UUID, buscando por UUID...");
      const series = await prisma.series.findUnique({
        where: { uuid: req.params.id },
        include: { 
          author: true,
          posts: {
            orderBy: {
              sequenceNumber: "asc"
            }
          }
        },
      });
      if (series) {
        return res.json(series);
      }
    }
    
    // Intentar buscar por ID numérico
    try {
      const seriesById = await prisma.series.findUnique({
        where: { id: parseInt(req.params.id) },
        include: { 
          author: true,
          posts: {
            orderBy: {
              sequenceNumber: "asc"
            }
          }
        },
      });
      if (seriesById) {
        return res.json(seriesById);
      }
    } catch (parseError) {
      console.log("No se pudo parsear el ID como número");
    }
    
    // Si llegamos aquí, no se encontró la serie
    return res.status(404).json({ error: "Series not found" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create series
router.post("/", async (req, res) => {
  try {
    const { title, description, slug, authorId, coverImage } = req.body;
    console.log("Creando nueva serie:", req.body);
    
    // Preparar los datos para la creación
    const seriesData = {
      title,
      description: description || "",
      slug,
      author: { connect: { id: parseInt(authorId) } }
    };
    
    // Manejar la imagen de portada si se proporciona
    if (coverImage) {
      console.log("Incluyendo imagen de portada en la nueva serie:", coverImage);
      seriesData.coverImage = coverImage;
    }
    
    console.log("Datos finales para crear serie:", seriesData);
    
    const series = await prisma.series.create({
      data: seriesData,
      include: {
        author: true
      }
    });
    
    console.log("Serie creada exitosamente:", {
      id: series.id,
      uuid: series.uuid,
      title: series.title
    });
    
    res.json(series);
  } catch (error) {
    console.error("Error al crear serie:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update series by UUID
router.put("/uuid/:uuid", async (req, res) => {
  try {
    const { title, description, slug, authorId, coverImage } = req.body;
    console.log("Actualizando serie por UUID:", req.params.uuid);
    console.log("Datos recibidos:", req.body);
    
    // Primero, obtener la serie actual para asegurarnos de no perder datos
    const existingSeries = await prisma.series.findUnique({
      where: { uuid: req.params.uuid },
      include: {
        author: true
      }
    });
    
    if (!existingSeries) {
      return res.status(404).json({ error: "Serie no encontrada" });
    }
    
    // Preparar los datos para la actualización
    const updateData = {};
    
    // Actualizar campos básicos solo si se proporcionan
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description || "";
    if (slug !== undefined) updateData.slug = slug;
    
    // Manejar la relación del autor si se proporciona
    if (authorId) {
      updateData.author = { connect: { id: parseInt(authorId) } };
    }
    
    // Manejar la imagen de portada
    if (coverImage !== undefined) {
      updateData.coverImage = coverImage;
    }
    
    console.log("Datos finales para actualizar:", JSON.stringify(updateData, null, 2));
    
    const series = await prisma.series.update({
      where: { uuid: req.params.uuid },
      data: updateData,
      include: {
        author: true,
        posts: {
          orderBy: {
            sequenceNumber: "asc"
          }
        }
      }
    });
    
    console.log("Serie actualizada exitosamente:", {
      id: series.id,
      uuid: series.uuid,
      title: series.title
    });
    
    res.json(series);
  } catch (error) {
    console.error("Error al actualizar serie:", error);
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

// Delete series by UUID
router.delete("/uuid/:uuid", async (req, res) => {
  try {
    // Verificar si hay posts asociados a esta serie
    const postsInSeries = await prisma.post.findMany({
      where: { 
        series: { uuid: req.params.uuid } 
      },
      select: { id: true }
    });
    
    // Si hay posts, actualizar sus referencias a la serie
    if (postsInSeries.length > 0) {
      await prisma.post.updateMany({
        where: { 
          series: { uuid: req.params.uuid } 
        },
        data: { 
          seriesId: null,
          sequenceNumber: null
        }
      });
    }
    
    // Eliminar la serie
    const series = await prisma.series.delete({
      where: { uuid: req.params.uuid }
    });
    
    res.json({ message: "Serie eliminada correctamente", series });
  } catch (error) {
    console.error("Error al eliminar serie:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add post to series
router.post("/uuid/:uuid/posts", async (req, res) => {
  try {
    const { postId, sequenceNumber } = req.body;
    
    if (!postId) {
      return res.status(400).json({ error: "Post ID is required" });
    }
    
    // Verificar que la serie existe
    const series = await prisma.series.findUnique({
      where: { uuid: req.params.uuid },
      select: { id: true }
    });
    
    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }
    
    // Verificar que el post existe
    const post = await prisma.post.findUnique({
      where: { id: parseInt(postId) },
      select: { id: true, title: true }
    });
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    // Determinar el número de secuencia si no se proporciona
    let sequence = sequenceNumber;
    if (!sequence) {
      // Obtener el número de secuencia más alto actual
      const highestSequence = await prisma.post.findFirst({
        where: { seriesId: series.id },
        orderBy: { sequenceNumber: "desc" },
        select: { sequenceNumber: true }
      });
      
      sequence = highestSequence ? (highestSequence.sequenceNumber + 1) : 1;
    }
    
    // Actualizar el post para añadirlo a la serie
    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: {
        seriesId: series.id,
        sequenceNumber: sequence
      },
      include: {
        series: true
      }
    });
    
    res.json(updatedPost);
  } catch (error) {
    console.error("Error al añadir post a serie:", error);
    res.status(500).json({ error: error.message });
  }
});

// Remove post from series
router.delete("/uuid/:uuid/posts/:postId", async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    
    // Verificar que la serie existe
    const series = await prisma.series.findUnique({
      where: { uuid: req.params.uuid },
      select: { id: true }
    });
    
    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }
    
    // Verificar que el post existe y pertenece a esta serie
    const post = await prisma.post.findFirst({
      where: { 
        id: postId,
        seriesId: series.id
      }
    });
    
    if (!post) {
      return res.status(404).json({ error: "Post not found in this series" });
    }
    
    // Actualizar el post para quitarlo de la serie
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        seriesId: null,
        sequenceNumber: null
      }
    });
    
    // Reordenar los posts restantes si es necesario
    await prisma.$executeRaw`
      UPDATE Post 
      SET sequenceNumber = sequenceNumber - 1 
      WHERE seriesId = ${series.id} 
      AND sequenceNumber > ${post.sequenceNumber}
    `;
    
    res.json({ message: "Post removed from series", post: updatedPost });
  } catch (error) {
    console.error("Error al quitar post de serie:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update post sequence in series
router.put("/uuid/:uuid/posts/:postId/sequence", async (req, res) => {
  try {
    const { sequenceNumber } = req.body;
    const postId = parseInt(req.params.postId);
    
    if (sequenceNumber === undefined) {
      return res.status(400).json({ error: "Sequence number is required" });
    }
    
    // Verificar que la serie existe
    const series = await prisma.series.findUnique({
      where: { uuid: req.params.uuid },
      select: { id: true }
    });
    
    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }
    
    // Verificar que el post existe y pertenece a esta serie
    const post = await prisma.post.findFirst({
      where: { 
        id: postId,
        seriesId: series.id
      }
    });
    
    if (!post) {
      return res.status(404).json({ error: "Post not found in this series" });
    }
    
    // Obtener el número de secuencia actual
    const currentSequence = post.sequenceNumber;
    
    // Actualizar el post con el nuevo número de secuencia
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        sequenceNumber: sequenceNumber
      }
    });
    
    // Reordenar los otros posts si es necesario
    if (sequenceNumber > currentSequence) {
      // Si se mueve hacia adelante, decrementar los que están entre el viejo y nuevo número
      await prisma.$executeRaw`
        UPDATE Post 
        SET sequenceNumber = sequenceNumber - 1 
        WHERE seriesId = ${series.id} 
        AND sequenceNumber > ${currentSequence} 
        AND sequenceNumber <= ${sequenceNumber}
        AND id != ${postId}
      `;
    } else if (sequenceNumber < currentSequence) {
      // Si se mueve hacia atrás, incrementar los que están entre el nuevo y viejo número
      await prisma.$executeRaw`
        UPDATE Post 
        SET sequenceNumber = sequenceNumber + 1 
        WHERE seriesId = ${series.id} 
        AND sequenceNumber >= ${sequenceNumber} 
        AND sequenceNumber < ${currentSequence}
        AND id != ${postId}
      `;
    }
    
    res.json(updatedPost);
  } catch (error) {
    console.error("Error al actualizar secuencia de post:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
