import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Genera y responde con el sitemap.xml de un blog por UUID
 */
export const getBlogSitemap = async (req, res) => {
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
      take: 1000
    });

    // Datos generales
    const siteUrl = blog.domain ? `https://${blog.domain}` : `https://${blog.subdomain}.tublog.com`;
    const urls = [];

    // Página principal
    urls.push({ loc: siteUrl, lastmod: new Date().toISOString(), changefreq: "daily", priority: 1.0 });

    // Posts
    posts.forEach(post => {
      urls.push({
        loc: `${siteUrl}/posts/${post.slug}`,
        lastmod: post.publishedAt ? post.publishedAt.toISOString() : new Date().toISOString(),
        changefreq: "weekly",
        priority: 0.8
      });
    });

    // Generar XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map(url =>
        `  <url>\n` +
        `    <loc>${url.loc}</loc>\n` +
        `    <lastmod>${url.lastmod}</lastmod>\n` +
        `    <changefreq>${url.changefreq}</changefreq>\n` +
        `    <priority>${url.priority}</priority>\n` +
        `  </url>`
      ).join("\n") +
      `\n</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error("Error generando sitemap:", error);
    res.status(500).send("Error generando sitemap");
  }
};
