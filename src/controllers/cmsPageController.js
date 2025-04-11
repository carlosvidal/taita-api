import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const createPage = async (req, res) => {
  console.log("Ruta /api/cms-pages/ ejecutada - método createPage");
  try {
    console.log("CMS Page Payload recibido:", JSON.stringify(req.body, null, 2));
    
    // Validar campos requeridos
    if (!req.body.title) {
      return res.status(400).json({ error: "Title is required" });
    }
    
    if (!req.body.content) {
      return res.status(400).json({ error: "Content is required" });
    }
    
    // Generar slug si no se proporciona
    const slug = req.body.slug || req.body.title
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-");
    
    try {
      // Crear la página con Prisma
      let pageData = {
        title: req.body.title,
        content: req.body.content,
        excerpt: req.body.excerpt || "",
        slug: slug,
        status: req.body.status === "published" ? "PUBLISHED" : "DRAFT",
        publishedAt: req.body.status === "published" ? new Date() : null
      };
      
      // Manejar la relación del autor
      if (req.body.authorId) {
        console.log("Usando authorId del payload:", req.body.authorId);
        // Intentar encontrar el autor por ID
        const admin = await prisma.admin.findFirst();
        if (!admin) {
          return res.status(400).json({ error: "No se encontró ningún autor" });
        }
        
        // Añadir la relación del autor
        pageData.author = {
          connect: { id: admin.id }
        };
      }
      
      // Crear la página
      const page = await prisma.page.create({
        data: pageData,
        include: {
          author: true
        }
      });
      
      console.log("Página creada exitosamente:", page.id);
      return res.status(201).json(page);
    } catch (prismaError) {
      console.error("Error de Prisma:", prismaError);
      return res.status(400).json({ error: prismaError.message });
    }
  } catch (error) {
    console.error("Error creating page:", error);
    return res.status(400).json({ error: error.message });
  }
};

export const updatePage = async (req, res) => {
  try {
    console.log("CMS Page Update Payload:", JSON.stringify(req.body, null, 2));
    console.log("UUID recibido:", req.params.id);
    
    // Validar campos requeridos
    if (!req.body.title) {
      return res.status(400).json({ error: "Title is required" });
    }
    
    if (!req.body.content) {
      return res.status(400).json({ error: "Content is required" });
    }
    
    // Verificar que la página existe
    const existingPage = await prisma.page.findUnique({
      where: { uuid: req.params.id }
    });
    
    if (!existingPage) {
      return res.status(404).json({ error: "Page not found" });
    }
    
    // Actualizar la página
    const updatedPage = await prisma.page.update({
      where: { uuid: req.params.id },
      data: {
        title: req.body.title,
        content: req.body.content,
        excerpt: req.body.excerpt || "",
        slug: req.body.slug || existingPage.slug,
        status: req.body.status === "published" ? "PUBLISHED" : "DRAFT",
        publishedAt: req.body.status === "published" && !existingPage.publishedAt ? new Date() : existingPage.publishedAt
      },
      include: {
        author: true
      }
    });
    
    console.log("Página actualizada exitosamente:", updatedPage.id);
    return res.status(200).json(updatedPage);
  } catch (error) {
    console.error("Error updating page:", error);
    return res.status(400).json({ error: error.message });
  }
};
