import { PrismaClient } from "@prisma/client";
import RSS from "rss";

const prisma = new PrismaClient();

/**
 * Genera y responde con el feed RSS de un blog por UUID
 */
export const getBlogRss = async (req, res) => {
  try {
    const { uuid } = req.params;
    // Buscar blog y configuración
    const blog = await prisma.blog.findUnique({
      where: { uuid },
      include: { settings: true }
    });
    if (!blog) return res.status(404).send("Blog no encontrado");

    // Buscar posts publicados de este blog
    const posts = await prisma.post.findMany({
      where: { blogId: blog.id, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 30
    });

    // Datos generales
    const siteUrl = blog.domain ? `https://${blog.domain}` : `https://${blog.subdomain}.tublog.com`;
    const feed = new RSS({
      title: blog.name,
      description: blog.settings?.description || '',
      feed_url: `${siteUrl}/rss.xml`,
      site_url: siteUrl,
      language: blog.settings?.language || 'es',
      pubDate: posts.length ? posts[0].publishedAt : new Date(),
    });

    posts.forEach(post => {
      feed.item({
        title: post.title,
        description: post.excerpt || '',
        url: `${siteUrl}/posts/${post.slug}`,
        guid: post.uuid,
        date: post.publishedAt,
      });
    });

    res.set('Content-Type', 'application/rss+xml');
    res.send(feed.xml({ indent: true }));
  } catch (error) {
    console.error("Error generando RSS:", error);
    res.status(500).send("Error generando RSS");
  }
};
