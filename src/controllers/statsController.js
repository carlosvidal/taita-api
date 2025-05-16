import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Obtener el conteo de posts
export const getPostsCount = async (req, res) => {
  try {
    const { blogId } = req.query;
    
    if (!blogId) {
      return res.status(400).json({ error: "El parámetro blogId es requerido" });
    }
    
    const count = await prisma.post.count({
      where: { blogId: parseInt(blogId) }
    });
    
    res.json({ count });
  } catch (error) {
    console.error("Error al obtener el conteo de posts:", error);
    res.status(500).json({ 
      error: "Error del servidor",
      details: error.message 
    });
  }
};

// Obtener el conteo de categorías
export const getCategoriesCount = async (req, res) => {
  try {
    const { blogId } = req.query;
    
    if (!blogId) {
      return res.status(400).json({ error: "El parámetro blogId es requerido" });
    }
    
    const count = await prisma.category.count({
      where: { blogId: parseInt(blogId) }
    });
    
    res.json({ count });
  } catch (error) {
    console.error("Error al obtener el conteo de categorías:", error);
    res.status(500).json({ 
      error: "Error del servidor",
      details: error.message 
    });
  }
};

// Obtener el conteo de páginas
export const getPagesCount = async (req, res) => {
  try {
    const { blogId } = req.query;
    
    if (!blogId) {
      return res.status(400).json({ error: "El parámetro blogId es requerido" });
    }
    
    const count = await prisma.page.count({
      where: { blogId: parseInt(blogId) }
    });
    
    res.json({ count });
  } catch (error) {
    console.error("Error al obtener el conteo de páginas:", error);
    res.status(500).json({ 
      error: "Error del servidor",
      details: error.message 
    });
  }
};
