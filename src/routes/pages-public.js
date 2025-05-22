import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// Obtener página pública por slug y tenant
router.get("/:slug", async (req, res) => {
  console.log("Entrando a endpoint público de pages:", req.originalUrl);
  try {
    const { slug } = req.params;
    // Obtener tenant desde query o header (igual que posts-public.js)
    const tenant = req.query.tenant || req.headers['x-taita-tenant'];
    if (!tenant) {
      return res.status(400).json({ error: "El parámetro 'tenant' es requerido" });
    }
    // Buscar el blog correspondiente al tenant
    const blog = await prisma.blog.findFirst({
      where: {
        OR: [
          { subdomain: tenant },
          { domain: tenant },
        ],
      },
      select: { id: true },
    });
    if (!blog) return res.status(404).json({ error: "Blog no encontrado" });
    // Buscar la página pública por slug y blog
    const page = await prisma.page.findFirst({
      where: {
        blogId: blog.id,
        slug,
        published: true,
        visible: true,
      },
    });
    if (!page) return res.status(404).json({ error: "Página no encontrada" });
    res.json(page);
  } catch (error) {
    console.error("Error al obtener página pública:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
