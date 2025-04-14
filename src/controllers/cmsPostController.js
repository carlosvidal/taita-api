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
    
    // Manejar la imagen si se proporciona
    if (req.body.image) {
      postData.image = req.body.image;
      
      if (req.body.imageId) {
        postData.imageId = parseInt(req.body.imageId);
      }
    }
    
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
          const category = await tx.category.findUnique({
            where: { id: parseInt(req.body.categoryId) }
          });
          if (!category) {
            throw new Error("Category not found");
          }
          categoryId = category.id;
        }
        
        // 3. Crear el post con la relación al autor
        const newPost = await tx.post.create({
          data: {
            ...postData,
            author: {
              connect: { id: admin.id }
            },
            // Conectar con la categoría si existe
            ...(categoryId ? {
              categories: {
                connect: [{ id: categoryId }]
              }
            } : {})
          },
          include: {
            author: true,
            categories: true
          }
        });
        
        return newPost;
      });
      
      console.log("Post creado exitosamente:", post);
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

export const updatePost = async (req, res) => {
  try {
    console.log("CMS Post Update Payload:", JSON.stringify(req.body, null, 2));
    console.log("UUID recibido:", req.params.id);
    
    // Validar campos requeridos
    if (!req.body.title) {
      return res.status(400).json({ error: "Title is required" });
    }
    
    if (!req.body.content) {
      return res.status(400).json({ error: "Content is required" });
    }
    
    // Verificar que el post existe
    const existingPost = await prisma.post.findUnique({
      where: { uuid: req.params.id },
      include: {
        categories: true
      }
    });
    
    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    // Preparar los datos para la actualización
    const updateData = {
      title: req.body.title,
      content: req.body.content,
      excerpt: req.body.excerpt || "",
      slug: req.body.slug || existingPost.slug,
      status: req.body.status === "published" ? "PUBLISHED" : "DRAFT",
      publishedAt: req.body.status === "published" && !existingPost.publishedAt ? new Date() : existingPost.publishedAt
    };
    
    // Manejar la imagen si se proporciona
    if (req.body.image) {
      // Si la imagen es una URL completa, asumimos que es una imagen válida
      updateData.image = req.body.image;
      
      // Si también se proporciona el ID de la imagen, lo guardamos
      if (req.body.imageId) {
        updateData.imageId = parseInt(req.body.imageId);
      }
    } else if (req.body.removeImage) {
      // Si se solicita eliminar la imagen
      updateData.image = null;
      updateData.imageId = null;
    }
    
    // Actualizar el post
    const updatedPost = await prisma.post.update({
      where: { uuid: req.params.id },
      data: updateData,
      include: {
        author: true,
        categories: true
      }
    });
    
    // Manejar categorías si se proporcionan
    if (req.body.categories && Array.isArray(req.body.categories)) {
      // Desconectar todas las categorías existentes
      await prisma.post.update({
        where: { id: updatedPost.id },
        data: {
          categories: {
            disconnect: existingPost.categories.map(cat => ({ id: cat.id }))
          }
        }
      });
      
      // Conectar las nuevas categorías
      if (req.body.categories.length > 0) {
        await prisma.post.update({
          where: { id: updatedPost.id },
          data: {
            categories: {
              connect: req.body.categories.map(catId => ({ id: parseInt(catId) }))
            }
          }
        });
      }
      
      // Obtener el post actualizado con las categorías
      const postWithCategories = await prisma.post.findUnique({
        where: { id: updatedPost.id },
        include: {
          author: true,
          categories: true
        }
      });
      
      console.log("Post actualizado exitosamente:", postWithCategories.id);
      return res.status(200).json(postWithCategories);
    }
    
    console.log("Post actualizado exitosamente:", updatedPost.id);
    return res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Error updating post:", error);
    return res.status(400).json({ error: error.message });
  }
};
