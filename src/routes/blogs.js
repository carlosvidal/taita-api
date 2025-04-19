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

// Actualizar blog por UUID
router.patch("/uuid/:uuid", authenticateUser, updateBlog);

// (Opcional) Actualizar blog por ID
router.patch("/:id", authenticateUser, updateBlog);

// Feed RSS público
router.get("/:uuid/rss.xml", getBlogRss);
// Sitemap público
router.get("/:uuid/sitemap.xml", getBlogSitemap);

export default router;
