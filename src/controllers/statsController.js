import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Obtener el conteo de posts
export const getPostsCount = async (req, res) => {
  try {
    const count = await prisma.post.count();
    res.json({ count });
  } catch (error) {
    console.error("Error al obtener el conteo de posts:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// Obtener el conteo de categorías
export const getCategoriesCount = async (req, res) => {
  try {
    const count = await prisma.category.count();
    res.json({ count });
  } catch (error) {
    console.error("Error al obtener el conteo de categorías:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};
