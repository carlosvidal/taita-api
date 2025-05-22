import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = express.Router();

// Endpoint público para obtener posts publicados (para el frontend público)
router.get("/", async (req, res) => {
  try {
    // Obtener el subdominio y dominio de la solicitud
    const host = req.headers.host || "";
    console.log("Host completo:", host);

    // Extraer subdominio y dominio de múltiples fuentes
    let subdomain = "";
    let domain = "";
    // Normalizar tenant/subdomain
    let tenant = req.query.tenant || req.headers["x-tenant"];
    if (tenant) {
      subdomain = tenant;
      console.log("Usando tenant:", tenant);
    }

    // Priorizar el header X-Taita-Subdomain si está presente
    if (req.headers["x-taita-subdomain"]) {
      subdomain = req.headers["x-taita-subdomain"];
      console.log("Usando subdominio del header X-Taita-Subdomain:", subdomain);
    }
    // Si no hay header, intentar obtenerlo de los query params
    else if (req.query.subdomain) {
      subdomain = req.query.subdomain;
      console.log("Usando subdominio de query param:", subdomain);
    }
    // Como última opción, intentar extraerlo del host
    else if (host) {
      // Manejar casos especiales como localhost o IP
      if (host.includes("localhost") || host.includes("127.0.0.1")) {
        subdomain = "demo"; // Usar un subdominio por defecto para desarrollo local
        console.log(
          "Desarrollo local, usando subdominio por defecto:",
          subdomain
        );
      } else {
        // Dividir el host por puntos
        const parts = host.split(".");

        if (parts.length >= 3 && parts[0] !== "www") {
          // Formato: subdomain.domain.tld
          subdomain = parts[0];
          domain = parts.slice(1).join(".");
        } else if (parts.length === 2) {
          // Formato: domain.tld (sin subdominio)
          domain = host;
          subdomain = "default";
        } else if (parts[0] === "www" && parts.length >= 3) {
          // Formato: www.domain.tld
          domain = parts.slice(1).join(".");
          subdomain = "default";
        }
      }
      console.log("Extraído subdominio del host:", subdomain);
    }

    // Si aún no tenemos subdominio, usar 'demo' como último recurso
    if (!subdomain) {
      subdomain = "demo";
      console.log("Usando subdominio por defecto (demo)");
    }

    console.log("Subdominio extraído:", subdomain);
    console.log("Dominio extraído:", domain);

    // Buscar el blog por subdominio y/o dominio
    let blog;

    if (subdomain) {
      // Primero intentar buscar por subdominio y dominio
      if (domain) {
        blog = await prisma.blog.findFirst({
          where: {
            subdomain,
            domain,
          },
        });

        if (blog) {
          console.log("Blog encontrado por subdominio y dominio:", blog.name);
        }
      }

      // Si no se encuentra, buscar solo por subdominio
      if (!blog) {
        blog = await prisma.blog.findFirst({
          where: { subdomain },
        });

        if (blog) {
          console.log("Blog encontrado solo por subdominio:", blog.name);
        }
      }
    }

    // Si no se encontró por subdominio, intentar por parámetros de consulta
    if (!blog) {
      if (req.query.blogId) {
        // Si se proporciona un blogId en la consulta
        blog = await prisma.blog.findUnique({
          where: { id: parseInt(req.query.blogId) },
        });

        if (blog) {
          console.log("Blog encontrado por blogId:", blog.name);
        }
      } else if (req.query.blogUuid) {
        // Si se proporciona un UUID de blog en la consulta
        blog = await prisma.blog.findFirst({
          where: { uuid: req.query.blogUuid },
        });

        if (blog) {
          console.log("Blog encontrado por blogUuid:", blog.name);
        }
      }
    }

    // Si no se encontró el blog, intentar usar el blog con ID 1 como fallback
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    console.log("Blog encontrado:", blog.name, "ID:", blog.id);

    // Obtener solo los posts publicados del blog
    const posts = await prisma.post.findMany({
      where: {
        blogId: blog.id,
        status: "PUBLISHED",
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            uuid: true,
            name: true,
          },
        },
      },
      orderBy: { publishedAt: "desc" },
    });

    console.log(
      `Encontrados ${posts.length} posts publicados para el blog ${blog.name}`
    );
    res.json(posts);
  } catch (error) {
    console.error("Error al obtener posts públicos:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint público para obtener un post específico por slug
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    // Obtener el subdominio y dominio de la solicitud
    const host = req.headers.host || "";
    console.log("Host completo:", host);

    // Extraer subdominio y dominio de múltiples fuentes
    let subdomain = "";
    let domain = "";

    // Priorizar el header X-Taita-Subdomain si está presente
    if (req.headers["x-taita-subdomain"]) {
      subdomain = req.headers["x-taita-subdomain"];
      console.log("Usando subdominio del header X-Taita-Subdomain:", subdomain);
    }
    // Si no hay header, intentar obtenerlo de los query params
    else if (req.query.subdomain) {
      subdomain = req.query.subdomain;
      console.log("Usando subdominio de query param:", subdomain);
    }
    // Como última opción, intentar extraerlo del host
    else if (host) {
      // Manejar casos especiales como localhost o IP
      if (host.includes("localhost") || host.includes("127.0.0.1")) {
        subdomain = "demo"; // Usar un subdominio por defecto para desarrollo local
        console.log(
          "Desarrollo local, usando subdominio por defecto:",
          subdomain
        );
      } else {
        // Dividir el host por puntos
        const parts = host.split(".");

        if (parts.length >= 3 && parts[0] !== "www") {
          // Formato: subdomain.domain.tld
          subdomain = parts[0];
          domain = parts.slice(1).join(".");
        } else if (parts.length === 2) {
          // Formato: domain.tld (sin subdominio)
          domain = host;
          subdomain = "default";
        } else if (parts[0] === "www" && parts.length >= 3) {
          // Formato: www.domain.tld
          domain = parts.slice(1).join(".");
          subdomain = "default";
        }
      }
      console.log("Extraído subdominio del host:", subdomain);
    }

    // Si aún no tenemos subdominio, usar 'demo' como último recurso
    if (!subdomain) {
      subdomain = "demo";
      console.log("Usando subdominio por defecto (demo)");
    }

    // Buscar el blog por subdominio y/o dominio
    let blog;

    if (subdomain) {
      // Primero intentar buscar por subdominio y dominio
      if (domain) {
        blog = await prisma.blog.findFirst({
          where: {
            subdomain,
            domain,
          },
        });
      }

      // Si no se encuentra, buscar solo por subdominio
      if (!blog) {
        blog = await prisma.blog.findFirst({
          where: { subdomain },
        });
      }
    }

    // Si no se encontró por subdominio, intentar por parámetros de consulta
    if (!blog && req.query.blogId) {
      blog = await prisma.blog.findUnique({
        where: { id: parseInt(req.query.blogId) },
      });
    } else if (!blog && req.query.blogUuid) {
      blog = await prisma.blog.findFirst({
        where: { uuid: req.query.blogUuid },
      });
    }

    // Si no se encontró el blog, intentar usar el blog con ID 1 como fallback
    if (!blog) {
      blog = await prisma.blog.findUnique({
        where: { id: 1 },
      });
    }

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // Buscar el post por slug y blogId
    const post = await prisma.post.findFirst({
      where: {
        slug,
        blogId: blog.id,
        status: "PUBLISHED",
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            uuid: true,
            name: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error al obtener post público por slug:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
