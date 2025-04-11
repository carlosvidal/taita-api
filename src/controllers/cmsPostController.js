import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const createPost = async (req, res) => {
  try {
    console.log("CMS Payload recibido:", JSON.stringify(req.body, null, 2));
    
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
    
    // Crear objeto de datos básico
    const postData = {
      title: req.body.title,
      content: req.body.content,
      excerpt: req.body.excerpt || "",
      slug: slug,
      status: req.body.status === "published" ? "PUBLISHED" : "DRAFT"
    };
    
    // Agregar fecha de publicación si corresponde
    if (req.body.status === "published") {
      postData.publishedAt = new Date();
    }
    
    // Agregar imagen y miniatura si existen
    if (req.body.image) postData.image = req.body.image;
    if (req.body.thumbnail) postData.thumbnail = req.body.thumbnail;
    
    try {
      // Crear el post con Prisma usando un enfoque directo
      const post = await prisma.$transaction(async (tx) => {
        // 1. Obtener el primer admin
        const admin = await tx.admin.findFirst();
        if (!admin) {
          throw new Error("No admin found to associate with this post");
        }
        
        // 2. Verificar la categoría si se proporciona
        let categoryId = null;
        if (req.body.categoryId) {
          const categoryIdNum = Number(req.body.categoryId);
          if (!isNaN(categoryIdNum)) {
            const category = await tx.category.findUnique({
              where: { id: categoryIdNum }
            });
            if (category) {
              categoryId = categoryIdNum;
            }
          }
        }
        
        // 3. Crear el post con relaciones correctas
        return await tx.post.create({
          data: {
            ...postData,
            author: {
              connect: { id: admin.id }
            },
            ...(categoryId ? {
              category: {
                connect: { id: categoryId }
              }
            } : {})
          },
          include: {
            author: true,
            category: true
          }
        });
      });
      
      console.log("Post creado exitosamente:", post.id);
      return res.status(201).json(post);
    } catch (prismaError) {
      console.error("Error de Prisma:", prismaError);
      return res.status(400).json({ error: prismaError.message });
    }
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(400).json({ error: error.message });
  }
};
