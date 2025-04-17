// Blog controller: crear y listar blogs
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Crear un nuevo blog y asociar al usuario como OWNER
export const createBlog = async (req, res) => {
  try {
    const { name, subdomain, domain, plan } = req.body;
    const userId = req.user.id; // El usuario autenticado

    // Crea el blog
    const blog = await prisma.blog.create({
      data: {
        name,
        subdomain,
        domain,
        plan,
        users: {
          create: {
            userId,
            role: 'OWNER'
          }
        }
      }
    });
    res.status(201).json(blog);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'No se pudo crear el blog', details: error.message });
  }
};

// Listar blogs del usuario autenticado
export const listBlogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const blogs = await prisma.blog.findMany({
      where: {
        users: { some: { userId } }
      }
    });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener blogs' });
  }
};
