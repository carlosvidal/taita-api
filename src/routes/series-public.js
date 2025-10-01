import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Helper function to get blogId from subdomain
const getBlogIdFromRequest = async (req) => {
  // Intentar obtener el subdomain de múltiples fuentes
  let subdomain = req.headers['x-taita-subdomain'] ||
                  req.query.tenant ||
                  req.query.subdomain;

  // Si no hay subdomain en los headers/query, intentar extraerlo del host
  if (!subdomain) {
    const host = req.headers.host || '';
    console.log('[series-public] Host recibido:', host);

    // Si es localhost, usar 'demo'
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      subdomain = 'demo';
    } else {
      // Extraer subdomain del host
      const parts = host.split('.');
      if (parts.length >= 3 && parts[0] !== 'www') {
        subdomain = parts[0];
      } else {
        subdomain = 'demo';
      }
    }
  }

  console.log('[series-public] Subdomain detectado:', subdomain);

  // Buscar el blog por subdomain
  const blog = await prisma.blog.findFirst({
    where: { subdomain: subdomain },
    select: { id: true, name: true }
  });

  if (!blog) {
    console.log('[series-public] Blog no encontrado para subdomain:', subdomain);
    return null;
  }

  console.log('[series-public] Blog encontrado:', blog);
  return blog.id;
};

// Get all series (public)
router.get('/', async (req, res) => {
  try {
    const blogId = await getBlogIdFromRequest(req);

    if (!blogId) {
      return res.status(404).json({
        success: false,
        error: 'Blog no encontrado'
      });
    }

    const series = await prisma.series.findMany({
      where: { blogId: blogId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            bio: true,
            picture: true
          }
        },
        _count: {
          select: { posts: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Mapear para incluir postCount
    const seriesWithCount = series.map(s => ({
      ...s,
      postCount: s._count.posts
    }));

    res.json({ success: true, data: seriesWithCount });
  } catch (error) {
    console.error('[series-public] Error al obtener series:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single series by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const blogId = await getBlogIdFromRequest(req);

    if (!blogId) {
      return res.status(404).json({
        success: false,
        error: 'Blog no encontrado'
      });
    }

    console.log('[series-public] Buscando serie:', { slug, blogId });

    const series = await prisma.series.findFirst({
      where: {
        slug: slug,
        blogId: blogId
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            bio: true,
            picture: true
          }
        },
        posts: {
          where: {
            status: 'PUBLISHED'
          },
          include: {
            category: true,
            author: {
              select: {
                id: true,
                name: true,
                bio: true,
                picture: true
              }
            }
          },
          orderBy: {
            sequenceNumber: 'asc'
          }
        }
      }
    });

    if (!series) {
      console.log('[series-public] Serie no encontrada:', { slug, blogId });
      return res.status(404).json({
        success: false,
        error: 'Serie no encontrada'
      });
    }

    // Mapear campos para frontend (snake_case)
    const seriesPublic = {
      ...series,
      post_count: series.posts.length,
      cover_image: series.coverImage,
      created_at: series.createdAt,
      updated_at: series.updatedAt,
      posts: series.posts.map(post => ({
        ...post,
        category_id: post.categoryId,
        author_id: post.authorId,
        series_id: post.seriesId,
        sequence_number: post.sequenceNumber,
        featured_image: post.image,
        image_id: post.imageId,
        published_at: post.publishedAt,
        created_at: post.createdAt,
        updated_at: post.updatedAt
      }))
    };

    console.log('[series-public] Serie encontrada:', {
      id: series.id,
      slug: series.slug,
      postCount: series.posts.length
    });

    res.json(seriesPublic);
  } catch (error) {
    console.error('[series-public] Error al obtener serie:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
