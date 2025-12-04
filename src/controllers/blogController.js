// Blog controller: crear y listar blogs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Crear un nuevo blog y asociar al admin
export const createBlog = async (req, res) => {
  try {
    console.log('[createBlog] Iniciando creación de blog');
    console.log('[createBlog] User role:', req.user.role);
    console.log('[createBlog] Request body:', req.body);

    // Permitir crear blogs a ADMIN y SUPER_ADMIN
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res
        .status(403)
        .json({ error: "Solo el administrador puede crear blogs." });
    }
    const { name, subdomain, domain, plan, adminId } = req.body;

    console.log('[createBlog] Datos extraídos:', { name, subdomain, domain, plan, adminId });

    // Permitir que el admin global cree blogs para otros admins si se provee adminId, si no, usar el propio
    const ownerId = adminId || req.user.id;

    console.log('[createBlog] Owner ID:', ownerId);

    // Nota: Removida la validación de blog único por admin
    // Ahora todos los admins (ADMIN y SUPER_ADMIN) pueden crear múltiples blogs
    console.log('[createBlog] Creando blog en la base de datos...');
    const blog = await prisma.blog.create({
      data: {
        name,
        subdomain,
        domain,
        plan,
        adminId: ownerId,
      },
    });

    console.log('[createBlog] Blog creado exitosamente:', blog.id);

    // Crear automáticamente la categoría "Sin categoría" para el nuevo blog
    try {
      await prisma.category.create({
        data: {
          name: 'Sin categoría',
          slug: 'sin-categoria',
          blogId: blog.id
        }
      });
      console.log(`✅ Categoría "Sin categoría" creada automáticamente para el blog ${blog.name}`);
    } catch (categoryError) {
      console.error('⚠️ Error al crear categoría "Sin categoría":', categoryError);
      // No interrumpir el flujo si falla la creación de la categoría
    }

    res.status(201).json(blog);
  } catch (error) {
    console.error('[createBlog] Error al crear blog:', error);
    console.error('[createBlog] Error name:', error.name);
    console.error('[createBlog] Error message:', error.message);
    console.error('[createBlog] Error stack:', error.stack);

    // Si es un error de Prisma, incluir más detalles
    if (error.code) {
      console.error('[createBlog] Prisma error code:', error.code);
      console.error('[createBlog] Prisma error meta:', error.meta);
    }

    res
      .status(400)
      .json({
        error: "No se pudo crear el blog",
        details: error.message,
        code: error.code || 'UNKNOWN'
      });
  }
};

// Listar blogs: SUPER_ADMIN ve todos, ADMIN solo los suyos
export const listBlogs = async (req, res) => {
  try {
    if (req.user.role === "SUPER_ADMIN") {
      // Acceso global
      const blogs = await prisma.blog.findMany();
      return res.json(blogs);
    }
    // ADMIN solo ve sus propios blogs
    const blogs = await prisma.blog.findMany({ where: { adminId: req.user.id } });
    return res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener blogs" });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const { name, subdomain, domain, plan } = req.body;
    let blog;

    if (req.params.uuid) {
      blog = await prisma.blog.update({
        where: { uuid: req.params.uuid },
        data: { name, subdomain, domain, plan },
      });
    } else if (req.params.id) {
      blog = await prisma.blog.update({
        where: { id: parseInt(req.params.id) },
        data: { name, subdomain, domain, plan },
      });
    } else {
      return res.status(400).json({ error: "Falta UUID o ID" });
    }

    res.json(blog);
  } catch (error) {
    console.error("Error al actualizar blog:", error);
    res.status(400).json({ error: error.message });
  }
};
