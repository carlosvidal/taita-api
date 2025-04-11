const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createPost = async (req, res) => {
  try {
    console.log("Payload recibido:", JSON.stringify(req.body, null, 2));
    
    // Verificar campos requeridos
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
    
    // Buscar el primer admin para asignarlo como autor si no se proporciona
    let authorData = {};
    
    // HARDCODEAR EL AUTOR CON ID 1
    console.log("Usando autor hardcodeado con ID 1");
    
    // Configurar los datos del autor para Prisma con ID fijo = 1
    authorData = {
      connect: { id: 1 }
    };
    
    // Manejar la categoría
    let categoryData = {};
    
    if (req.body.category && req.body.category.connect && req.body.category.connect.id) {
      const categoryId = parseInt(req.body.category.connect.id);
      
      if (!isNaN(categoryId) && categoryId > 0) {
        // Verificar que la categoría existe
        const category = await prisma.category.findUnique({
          where: { id: categoryId }
        });
        
        if (category) {
          categoryData = {
            connect: { id: categoryId }
          };
          console.log(`Usando categoría ID: ${categoryId}`);
        }
      }
    }
    
    // Preparar el objeto de datos para crear el post
    const createData = {
      title: req.body.title,
      content: req.body.content,
      excerpt: req.body.excerpt || "",
      slug: slug,
      status: req.body.status === "published" ? "PUBLISHED" : "DRAFT",
      author: authorData, // Usar la estructura correcta para la relación author
      ...(Object.keys(categoryData).length > 0 ? { category: categoryData } : {})
    };
    
    // Eliminar cualquier authorId que pudiera haber en el objeto
    if (createData.authorId) {
      delete createData.authorId;
    }
    
    // Agregar publishedAt si el estado es published
    if (req.body.status === "published") {
      createData.publishedAt = new Date();
    }
    
    // Agregar imagen y miniatura si existen
    if (req.body.image) createData.image = req.body.image;
    if (req.body.thumbnail) createData.thumbnail = req.body.thumbnail;
    
    console.log("Datos para crear post:", JSON.stringify(createData, null, 2));
    
    try {
      // Crear el post con Prisma
      const post = await prisma.post.create({
        data: createData,
        include: {
          category: true,
          author: true
        }
      });
      
      console.log("Post creado exitosamente:", post.id);
      return res.status(201).json(post);
    } catch (prismaError) {
      console.error("Error de Prisma:", prismaError);
      console.error("Detalles del error:", JSON.stringify(prismaError, null, 2));
      return res.status(400).json({ error: prismaError.message });
    }
  } catch (error) {
    console.error("Error creating post:", error);
    if (error.code) console.error("Error code:", error.code);
    if (error.meta) console.error("Error meta:", error.meta);
    
    return res.status(400).json({ error: error.message });
  }
};

exports.getPosts = async (req, res) => {
  const query = { status: "published" }; // Only show published by default
  if (req.query.includeDrafts === "true") {
    delete query.status;
  }
  // ... rest of your existing code
};

// En el método de actualización
exports.updatePost = async (req, res) => {
  try {
    const post = await prisma.post.update({
      where: { uuid: req.params.uuid },
      data: {
        ...req.body,
        updatedAt: new Date(),
        publishedAt: req.body.status === "published" ? new Date() : undefined,
      },
    });
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
