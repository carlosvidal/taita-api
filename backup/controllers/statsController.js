import Post from "../models/Post.js";
import Category from "../models/Category.js";

// Obtener el conteo de posts
export const getPostsCount = async (req, res) => {
  try {
    const count = await Post.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error("Error al obtener el conteo de posts:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// Obtener el conteo de categorías
export const getCategoriesCount = async (req, res) => {
  try {
    const count = await Category.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error("Error al obtener el conteo de categorías:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};
