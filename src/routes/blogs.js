// Rutas para crear y listar blogs
import express from "express";
import {
  createBlog,
  listBlogs,
  updateBlog,
} from "../controllers/blogController.js";
import { getBlogRss } from "../controllers/rssController.js";
import { getBlogSitemap } from "../controllers/sitemapController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
const router = express.Router();

// Crear un nuevo blog
router.post("/", authenticateUser, createBlog);

// Listar blogs del usuario
router.get("/", authenticateUser, listBlogs);

// Obtener blog por UUID
router.get("/uuid/:uuid", authenticateUser, async (req, res) => {
  try {
    const { uuid } = req.params;
    
    // Usar PrismaClient directamente desde el contexto global
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log(`Buscando blog con UUID: ${uuid}`);
    
    const blog = await prisma.blog.findFirst({
      where: { uuid }
    });
    
    if (!blog) {
      console.log(`Blog con UUID ${uuid} no encontrado`);
      return res.status(404).json({ error: "Blog no encontrado" });
    }
    
    console.log(`Blog encontrado: ${blog.name} (ID: ${blog.id})`);
    
    // Verificar que el usuario tiene acceso al blog
    if (blog.adminId !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      console.log(`Usuario ${req.user.id} no tiene permiso para acceder al blog ${blog.id}`);
      return res.status(403).json({ error: "No tienes permiso para acceder a este blog" });
    }
    
    return res.json(blog);
  } catch (error) {
    console.error('Error al obtener blog por UUID:', error);
    return res.status(500).json({ error: "Error al obtener el blog: " + error.message });
  }
});

// Actualizar blog por UUID
router.patch("/uuid/:uuid", authenticateUser, updateBlog);

// (Opcional) Actualizar blog por ID
router.patch("/:id", authenticateUser, updateBlog);

// Feed RSS público
router.get("/:uuid/rss.xml", getBlogRss);
// Sitemap público
router.get("/:uuid/sitemap.xml", getBlogSitemap);

export default router;
