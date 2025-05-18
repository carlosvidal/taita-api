import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Obtener el conteo de posts
// Obtener el conteo de posts
// En statsController.js
export const getPostsCount = async (req, res) => {
  try {
    const { blogId } = req.query;

    if (!blogId) {
      return res
        .status(400)
        .json({ error: "El parámetro blogId es requerido" });
    }

    const blogIdNum = parseInt(blogId);
    console.log(
      `[getPostsCount] Contando posts para blogId: ${blogIdNum} (tipo: ${typeof blogIdNum})`
    );

    // Contar todos los posts del blog, sin filtrar por estado
    const count = await prisma.post.count({
      where: {
        blogId: blogIdNum,
      },
    });

    console.log(
      `[getPostsCount] Total de posts encontrados: ${count} para blogId: ${blogIdNum}`
    );

    // Verificar si el blog existe
    const blog = await prisma.blog.findUnique({
      where: { id: blogIdNum },
    });

    console.log(`[getPostsCount] Blog encontrado:`, blog);

    res.json({ count });
  } catch (error) {
    console.error("Error al obtener el conteo de posts:", error);
    res.status(500).json({
      error: "Error del servidor",
      details: error.message,
    });
  }
};

// Obtener el conteo de categorías
export const getCategoriesCount = async (req, res) => {
  try {
    const { blogId } = req.query;

    if (!blogId) {
      return res
        .status(400)
        .json({ error: "El parámetro blogId es requerido" });
    }

    console.log(
      `[getCategoriesCount] Contando categorías para blogId: ${blogId} (tipo: ${typeof blogId})`
    );

    const count = await prisma.category.count({
      where: { blogId: parseInt(blogId) },
    });

    console.log(
      `[getCategoriesCount] Total de categorías encontradas: ${count}`
    );

    res.json({ count });
  } catch (error) {
    console.error("Error al obtener el conteo de categorías:", error);
    res.status(500).json({
      error: "Error del servidor",
      details: error.message,
    });
  }
};

// Obtener el conteo de páginas
export const getPagesCount = async (req, res) => {
  try {
    const { blogId } = req.query;

    if (!blogId) {
      return res
        .status(400)
        .json({ error: "El parámetro blogId es requerido" });
    }

    const count = await prisma.page.count({
      where: { blogId: parseInt(blogId) },
    });

    res.json({ count });
  } catch (error) {
    console.error("Error al obtener el conteo de páginas:", error);
    res.status(500).json({
      error: "Error del servidor",
      details: error.message,
    });
  }
};
