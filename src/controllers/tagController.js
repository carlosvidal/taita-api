import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Obtener todos los tags públicos
export const getPublicTags = async (req, res) => {
  try {
    // Obtener tenant desde query o header (igual que posts-public.js)
    const tenant = req.query.tenant || req.headers['x-taita-tenant'];
    if (!tenant) {
      return res.status(400).json({ error: "El parámetro 'tenant' es requerido" });
    }
    const tags = await prisma.tag.findMany({
      where: {
        blog: {
          OR: [{ subdomain: tenant }, { domain: tenant }],
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            postTags: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Formatear la respuesta para incluir el conteo de posts
    const formattedTags = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      posts_count: tag._count.postTags,
    }));

    res.json({ data: formattedTags });
  } catch (error) {
    console.error("Error al obtener los tags:", error);
    res.status(500).json({ error: "Error al cargar las etiquetas" });
  }
};

// Obtener posts por tag (público)
export const getPostsByTag = async (req, res) => {
  try {
    const { slug } = req.params;
    const tenant = req.query.tenant || req.headers['x-taita-tenant'];
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 10;

    if (!tenant) {
      return res.status(400).json({ error: "El parámetro 'tenant' es requerido" });
    }

    const tag = await prisma.tag.findFirst({
      where: {
        slug,
        blog: {
          OR: [{ subdomain: tenant }, { domain: tenant }],
        },
      },
      include: {
        postTags: {
          include: {
            post: {
              include: {
                author: { select: { id: true, name: true, picture: true } },
                category: { select: { id: true, name: true, slug: true } },
              }
            }
          }
        }
      }
    });

    if (!tag) {
      return res.status(404).json({ error: "Etiqueta no encontrada" });
    }

    // Filtrar solo posts publicados y paginar
    const publishedPosts = tag.postTags
      .map(pt => pt.post)
      .filter(post => post && post.status === "PUBLISHED" && post.publishedAt && new Date(post.publishedAt) <= new Date());

    const totalPosts = publishedPosts.length;
    const totalPages = Math.ceil(totalPosts / perPage);
    const paginatedPosts = publishedPosts.slice((page - 1) * perPage, page * perPage);

    res.json({
      data: {
        ...tag,
        posts: paginatedPosts,
        pagination: {
          total: totalPosts,
          current_page: page,
          last_page: totalPages,
          per_page: perPage,
        },
      },
    });
  } catch (error) {
    console.error("Error al obtener posts por tag:", error);
    res.status(500).json({ error: "Error al cargar los posts" });
  }
};
