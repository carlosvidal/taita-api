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
      
      // Manejar la imagen si se proporciona
      if (req.body.image) {
        pageData.image = req.body.image;
        
        if (req.body.imageId) {
          pageData.imageId = parseInt(req.body.imageId);
        }
      }
      
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
    console.log("Actualizando página por UUID:", req.params.id, req.body);
    console.log("Datos de imagen recibidos:", {
      image: req.body.image,
      imageId: req.body.imageId,
      removeImage: req.body.removeImage
    });
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
    
    // Preparar los datos para la actualización
    const updateData = {
      title: req.body.title,
      content: req.body.content,
      excerpt: req.body.excerpt || "",
      slug: req.body.slug || existingPage.slug,
      status: req.body.status === "published" ? "PUBLISHED" : "DRAFT",
      publishedAt: req.body.status === "published" && !existingPage.publishedAt ? new Date() : existingPage.publishedAt
    };
    
    // Manejar la imagen si se proporciona
    if (req.body.image !== undefined) {
      console.log("Actualizando imagen de la página:", req.body.image);
      
      // Si la imagen es una cadena vacía, tratarla como null
      if (req.body.image === "") {
        updateData.image = null;
        updateData.imageId = null;
        console.log("Imagen vacía, estableciendo a null");
      } else {
        // Asegurarnos de que la imagen se guarde correctamente
        updateData.image = req.body.image;
        
        // Si también se proporciona el ID de la imagen, lo guardamos
        if (req.body.imageId) {
          updateData.imageId = parseInt(req.body.imageId);
          console.log("ID de imagen convertido a entero:", updateData.imageId);
        }
        
        // Forzar la actualización de la imagen
        console.log("Forzando actualización de imagen en la página");
      }
    } else if (req.body.removeImage) {
      // Si se solicita eliminar la imagen
      console.log("Eliminando imagen de la página");
      updateData.image = null;
      updateData.imageId = null;
    }
    
    console.log("Datos finales para actualizar:", updateData);
    
    // Verificar los datos antes de actualizar
    console.log("Verificando datos de actualización:", {
      uuid: req.params.id,
      updateData
    });
    
    try {
      // Actualizar la página
      const updatedPage = await prisma.page.update({
        where: { uuid: req.params.id },
        data: updateData,
        include: {
          author: true
        }
      });
      
      // Verificar que la actualización se haya realizado correctamente
      console.log("Página actualizada exitosamente:", {
        id: updatedPage.id,
        uuid: updatedPage.uuid,
        title: updatedPage.title,
        image: updatedPage.image,
        imageId: updatedPage.imageId
      });
      
      // Verificar en la base de datos que la actualización se haya guardado
      const verifiedPage = await prisma.page.findUnique({
        where: { uuid: req.params.id }
      });
      
      console.log("Verificación de la actualización en la base de datos:", {
        id: verifiedPage.id,
        uuid: verifiedPage.uuid,
        image: verifiedPage.image,
        imageId: verifiedPage.imageId
      });
      
      return res.status(200).json(updatedPage);
    } catch (updateError) {
      console.error("Error al actualizar la página:", updateError);
      throw updateError;
    }
  } catch (error) {
    console.error("Error updating page:", error);
    return res.status(400).json({ error: error.message });
  }
};
