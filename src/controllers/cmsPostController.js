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

        // 3. Procesar tags si se proporcionan (crear los que no existan)
        let tagIds = [];
        if (req.body.tagNames && Array.isArray(req.body.tagNames) && req.body.tagNames.length > 0) {
          for (const tagName of req.body.tagNames) {
            const trimmedName = tagName.trim();
            if (!trimmedName) continue;

            // Generar slug para el tag
            const tagSlug = trimmedName
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-+|-+$)/g, '')
              .substring(0, 50);

            // Buscar o crear el tag
            const tag = await tx.tag.upsert({
              where: { slug: tagSlug },
              update: {},
              create: {
                name: trimmedName,
                slug: tagSlug
              }
            });

            tagIds.push(tag.id);
          }
        }

        // 4. Crear el post con la relación al autor
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
            } : {}),
            // Conectar con los tags si existen
            ...(tagIds.length > 0 ? {
              tags: {
                connect: tagIds.map(id => ({ id }))
              }
            } : {})
          },
          include: {
            author: true,
            categories: true,
            tags: true
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
        categories: true,
        tags: true
      }
    });

    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Usar transacción para manejar tags y actualización del post
    const updatedPost = await prisma.$transaction(async (tx) => {
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
        updateData.image = req.body.image;
        if (req.body.imageId) {
          updateData.imageId = parseInt(req.body.imageId);
        }
      } else if (req.body.removeImage) {
        updateData.image = null;
        updateData.imageId = null;
      }

      // Procesar tags si se proporcionan
      let tagIds = [];
      if (req.body.tagNames && Array.isArray(req.body.tagNames)) {
        for (const tagName of req.body.tagNames) {
          const trimmedName = tagName.trim();
          if (!trimmedName) continue;

          // Generar slug para el tag
          const tagSlug = trimmedName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-+|-+$)/g, '')
            .substring(0, 50);

          // Buscar o crear el tag
          const tag = await tx.tag.upsert({
            where: { slug: tagSlug },
            update: {},
            create: {
              name: trimmedName,
              slug: tagSlug
            }
          });

          tagIds.push(tag.id);
        }

        // Desconectar todos los tags existentes
        if (existingPost.tags.length > 0) {
          await tx.post.update({
            where: { id: existingPost.id },
            data: {
              tags: {
                disconnect: existingPost.tags.map(tag => ({ id: tag.id }))
              }
            }
          });
        }

        // Conectar los nuevos tags
        if (tagIds.length > 0) {
          updateData.tags = {
            connect: tagIds.map(id => ({ id }))
          };
        }
      }

      // Actualizar el post
      const post = await tx.post.update({
        where: { uuid: req.params.id },
        data: updateData,
        include: {
          author: true,
          categories: true,
          tags: true
        }
      });

      // Manejar categorías si se proporcionan
      if (req.body.categories && Array.isArray(req.body.categories)) {
        // Desconectar todas las categorías existentes
        if (existingPost.categories.length > 0) {
          await tx.post.update({
            where: { id: post.id },
            data: {
              categories: {
                disconnect: existingPost.categories.map(cat => ({ id: cat.id }))
              }
            }
          });
        }

        // Conectar las nuevas categorías
        if (req.body.categories.length > 0) {
          await tx.post.update({
            where: { id: post.id },
            data: {
              categories: {
                connect: req.body.categories.map(catId => ({ id: parseInt(catId) }))
              }
            }
          });
        }

        // Obtener el post actualizado con las categorías y tags
        const postWithRelations = await tx.post.findUnique({
          where: { id: post.id },
          include: {
            author: true,
            categories: true,
            tags: true
          }
        });

        return postWithRelations;
      }

      return post;
    });

    console.log("Post actualizado exitosamente:", updatedPost.id);
    return res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Error updating post:", error);
    return res.status(400).json({ error: error.message });
  }
};
