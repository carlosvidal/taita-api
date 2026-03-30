import express from "express";
import dotenv from "dotenv";
import Cap from "@cap.js/server";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import cors from "cors";
import authRouter from "./routes/auth.js";
import authenticateToken from "./middleware/authenticateToken.js";
import blogsRouter from "./routes/blogs.js";
import categoriesPublicRouter from "./routes/categories-public.js";
import categoriesRouter from "./routes/categories.js";
import cmsPagesRouter from "./routes/cmsPages.js";
import cmsPostsRouter from "./routes/cmsPosts.js";
import commentsRouter from "./routes/comments.js";
import emailsRouter from "./routes/emails.js";
import mediaRouter from "./routes/media.js";
import menuPublicRouter from "./routes/menu-public.js";
import menuRouter from "./routes/menu.js";
import pagesRouter from "./routes/pages.js";
import passwordRouter from "./routes/password.js";
import paymentRouter from "./routes/paymentRoutes.js";
import postsPublicRouter from "./routes/posts-public.js";
import postsRouter from "./routes/posts.js";
import profilePictureTestRouter from "./routes/profilePictureTest.js";
import seriesRouter from "./routes/series.js";
import settingsPublicRouter from "./routes/settings-public.js";
import settingsRouter from "./routes/settings.js";
import statsRouter from "./routes/stats.js";
import subscriptionsRouter from "./routes/subscriptions.js";
import tagsPublicRouter from "./routes/tags-public.js";
import tagsRouter from "./routes/tags.js";
import userProfileRouter from "./routes/userProfile.js";
import { addDebugRoutes } from "./controllers/commentsController.js";
import v1PostsRouter from "./routes/v1/posts.js";
import apiKeysRouter from "./routes/apiKeys.js";
import subscribersPublicRouter from "./routes/subscribers-public.js";
import subscribersRouter from "./routes/subscribers.js";
import subscriberManagementRouter from "./routes/subscriberManagement.js";
import integrationsRouter from "./routes/integrations.js";

dotenv.config();

// Configurar __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar Prisma
const prisma = new PrismaClient();

// Función para corregir la base de datos
async function fixDatabase() {
  console.log("Iniciando corrección de la base de datos...");

  try {
    // 1. Verificar y obtener el usuario admin
    let admin = await prisma.admin.findFirst({
      where: { role: "SUPER_ADMIN" },
    });

    if (!admin) {
      console.log(
        "No se encontró un usuario SUPER_ADMIN. Creando uno nuevo..."
      );

      // Crear un nuevo admin si no existe
      const hashedPassword = await bcrypt.hash("securepassword", 10);

      admin = await prisma.admin.create({
        data: {
          uuid: uuidv4(),
          email: "admin@example.com",
          password: hashedPassword,
          name: "Admin User",
          role: "SUPER_ADMIN",
        },
      });
      console.log(`Nuevo admin creado: ${admin.name} (${admin.email})`);
    } else {
      console.log(`Admin encontrado: ${admin.name} (${admin.email})`);
    }

    // 2. Verificar blogs existentes
    const existingBlogs = await prisma.blog.findMany();
    console.log(
      `Se encontraron ${existingBlogs.length} blogs en la base de datos`
    );

    // 3. Procesar cada blog existente
    for (const blog of existingBlogs) {
      console.log(
        `Procesando blog ID ${blog.id}: ${blog.name || "Sin nombre"}`
      );

      // Verificar si el blog tiene UUID
      if (!blog.uuid) {
        await prisma.blog.update({
          where: { id: blog.id },
          data: { uuid: uuidv4() },
        });
        console.log(`- Asignado nuevo UUID al blog ID ${blog.id}`);
      }

      // Verificar si el blog está asociado a un admin
      if (!blog.adminId) {
        try {
          await prisma.blog.update({
            where: { id: blog.id },
            data: { adminId: admin.id },
          });
          console.log(`- Asociado blog ID ${blog.id} al admin ID ${admin.id}`);
        } catch (error) {
          if (error.code === "P2002") {
            // Si hay un error de restricción única, verificar si ya existe un blog con este admin
            const existingBlog = await prisma.blog.findFirst({
              where: { adminId: admin.id },
            });

            if (existingBlog) {
              console.log(
                `- El admin ID ${admin.id} ya está asociado al blog ID ${existingBlog.id}. No se puede asociar al blog ID ${blog.id}`
              );

              // Si el blog actual no tiene admin, crear un nuevo admin para él
              const newAdmin = await prisma.admin.create({
                data: {
                  uuid: uuidv4(),
                  email: `admin-blog${blog.id}@example.com`,
                  password: await bcrypt.hash(`blog${blog.id}password`, 10),
                  name: `Admin Blog ${blog.id}`,
                  role: "ADMIN",
                },
              });

              // Asociar el blog al nuevo admin
              await prisma.blog.update({
                where: { id: blog.id },
                data: { adminId: newAdmin.id },
              });

              console.log(
                `- Creado nuevo admin ID ${newAdmin.id} para el blog ID ${blog.id}`
              );
            }
          } else {
            console.error(
              `- Error al actualizar el blog ID ${blog.id}:`,
              error
            );
          }
        }
      }

      // Verificar si el blog tiene subdominio
      if (!blog.subdomain) {
        const subdomain = blog.name
          ? blog.name.toLowerCase().replace(/[^a-z0-9]/g, "")
          : `blog${blog.id}`;

        await prisma.blog.update({
          where: { id: blog.id },
          data: { subdomain },
        });
        console.log(
          `- Asignado subdominio "${subdomain}" al blog ID ${blog.id}`
        );
      }

      // Verificar si el blog tiene plan
      if (!blog.plan) {
        await prisma.blog.update({
          where: { id: blog.id },
          data: { plan: "FREE" },
        });
        console.log(`- Asignado plan "FREE" al blog ID ${blog.id}`);
      }

      // Verificar y crear categorías por defecto si no existen
      const defaultCategories = [
        { name: "Tecnología", slug: "tecnologia" },
        { name: "Vida", slug: "vida" },
        { name: "Noticias", slug: "noticias" },
      ];

      let createdCount = 0;

      for (const cat of defaultCategories) {
        try {
          // Verificar si la categoría ya existe para este blog
          const existingCategory = await prisma.category.findFirst({
            where: {
              blogId: blog.id,
              OR: [{ name: cat.name }, { slug: cat.slug }],
            },
          });

          if (!existingCategory) {
            await prisma.category.create({
              data: {
                name: cat.name,
                slug: cat.slug,
                blogId: blog.id,
              },
            });
            createdCount++;
          }
        } catch (error) {
          console.error(
            `- Error al crear la categoría ${cat.name}:`,
            error.message
          );
        }
      }

      if (createdCount > 0) {
        console.log(
          `- Creadas ${createdCount} categorías para el blog ID ${blog.id}`
        );
      } else {
        const totalCategories = await prisma.category.count({
          where: { blogId: blog.id },
        });
        console.log(
          `- El blog ID ${blog.id} ya tiene ${totalCategories} categorías`
        );
      }
    }

    // 4. Si no hay blogs, crear uno nuevo
    if (existingBlogs.length === 0) {
      console.log("No se encontraron blogs. Creando un blog de ejemplo...");

      const newBlog = await prisma.blog.create({
        data: {
          uuid: uuidv4(),
          name: "Blog Principal",
          subdomain: "demo",
          plan: "FREE",
          adminId: admin.id,
          title: "Blog Principal",
          description: "Un blog de ejemplo para pruebas.",
          language: "es",
          template: "default",
          googleAnalyticsId: "",
          socialNetworks: { twitter: "", facebook: "", instagram: "" },
        },
      });

      console.log(
        `Nuevo blog creado con ID: ${newBlog.id} y UUID: ${newBlog.uuid}`
      );

      // Crear categorías para el nuevo blog
      const defaultCategories = [
        { name: "Tecnología", slug: "tecnologia" },
        { name: "Vida", slug: "vida" },
        { name: "Noticias", slug: "noticias" },
      ];

      for (const cat of defaultCategories) {
        try {
          await prisma.category.create({
            data: {
              name: cat.name,
              slug: cat.slug,
              blogId: newBlog.id,
            },
          });
          console.log(`- Categoría creada: ${cat.name}`);
        } catch (error) {
          console.error(
            `- Error al crear la categoría ${cat.name}:`,
            error.message
          );
        }
      }

      console.log("Categorías creadas para el nuevo blog");
    }

    // 5. Mostrar todos los blogs disponibles
    const allBlogs = await prisma.blog.findMany({
      select: {
        id: true,
        uuid: true,
        name: true,
        subdomain: true,
        adminId: true,
        _count: {
          select: { categories: true },
        },
      },
    });

    console.log("\nBlogs disponibles después de las correcciones:");
    console.log(
      allBlogs.map((blog) => ({
        id: blog.id,
        uuid: blog.uuid,
        name: blog.name,
        subdomain: blog.subdomain,
        adminId: blog.adminId,
        categories: blog._count.categories,
      }))
    );

    console.log(
      "\nProceso de corrección de base de datos completado con éxito"
    );
    return true;
  } catch (error) {
    console.error(
      "Error durante el proceso de corrección de la base de datos:",
      error
    );
    return false;
  }
}

const app = express();
const port = process.env.PORT || 3000;
addDebugRoutes(app);

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin || '';

  // Allow: any *.taita.blog subdomain, taita.blog itself, localhost for dev
  const isAllowed =
    !origin ||
    origin.endsWith('.taita.blog') ||
    origin === 'https://taita.blog' ||
    origin.startsWith('http://localhost');

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Taita-Subdomain, X-Tenant, X-API-Key, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

// Rate limiting
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'Please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 login attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts', message: 'Please try again later' },
});

app.use('/api/v1/', apiLimiter);
app.use('/api/auth/login', authLimiter);

app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// External API v1 (authenticated via API key, not JWT)
app.use("/api/v1/posts", v1PostsRouter);
app.use("/api/v1", v1PostsRouter); // Also mounts /api/v1/blogs, /api/v1/categories, /api/v1/tags

// Endpoint interno de verificación de emails
app.use("/api/emails", emailsRouter);

// Endpoint de diagnóstico para solucionar problemas
app.get("/api/debug/tenant", async (req, res) => {
  try {
    // Extra todos los posibles identificadores de tenant
    const host = req.headers.host || "";
    const xTaitaSubdomain = req.headers["x-taita-subdomain"] || "";
    const querySubdomain = req.query.subdomain || "";
    const origin = req.headers.origin || "";

    // Leer todos los headers para depuración
    const headers = {};
    Object.keys(req.headers).forEach((key) => {
      headers[key] = req.headers[key];
    });

    // Determinar subdomain efectivo
    let subdomain = xTaitaSubdomain || querySubdomain || "";
    if (!subdomain && host) {
      subdomain = host.includes(".")
        ? host.split(".")[0]
        : host.includes(":")
        ? "demo"
        : host;
    }

    // Buscar blog por subdomain
    let blog = null;
    if (subdomain) {
      blog = await prisma.blog.findFirst({
        where: { subdomain },
      });
    }

    // Obtener lista de blogs para diagnóstico
    const allBlogs = await prisma.blog.findMany({
      select: {
        id: true,
        uuid: true,
        name: true,
        subdomain: true,
        domain: true,
        _count: {
          select: {
            posts: {
              where: { status: "PUBLISHED" },
            },
          },
        },
      },
    });

    // Devolver información de diagnóstico
    res.json({
      host,
      headers,
      queryParams: req.query,
      detectedSubdomain: subdomain,
      sources: {
        xTaitaSubdomain,
        querySubdomain,
        fromHost: host.includes(".") ? host.split(".")[0] : "",
      },
      blog,
      allBlogs: allBlogs.map((b) => ({
        ...b,
        postsCount: b._count.posts,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error en endpoint de diagnóstico:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de diagnóstico para posts
app.get("/api/debug/posts", async (req, res) => {
  try {
    // Obtener subdomain de múltiples fuentes
    const subdomain =
      req.headers["x-taita-subdomain"] || req.query.subdomain || "demo";

    console.log(`[DEBUG] Buscando posts para subdomain: ${subdomain}`);

    // Buscar blog
    const blog = await prisma.blog.findFirst({
      where: { subdomain },
    });

    if (!blog) {
      console.log(`[DEBUG] No se encontró blog con subdomain: ${subdomain}`);
      return res.status(404).json({
        error: "Blog no encontrado",
        subdomain,
        availableBlogs: await prisma.blog.findMany({
          select: { id: true, name: true, subdomain: true },
        }),
      });
    }

    console.log(`[DEBUG] Blog encontrado: ${blog.name} (ID: ${blog.id})`);

    // Buscar posts publicados
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
            name: true,
            bio: true,
          },
        },
      },
      orderBy: { publishedAt: "desc" },
    });

    console.log(`[DEBUG] Encontrados ${posts.length} posts publicados`);

    return res.json({
      success: true,
      blogId: blog.id,
      blogName: blog.name,
      subdomain: blog.subdomain,
      postsCount: posts.length,
      posts: posts.map((p) => ({
        id: p.id,
        uuid: p.uuid,
        title: p.title,
        slug: p.slug,
        publishedAt: p.publishedAt,
      })),
    });
  } catch (error) {
    console.error("Error en endpoint de diagnóstico de posts:", error);
    return res.status(500).json({ error: error.message });
  }
});

// --- Cap endpoints ---
const cap = new Cap({
  tokens_store_path: ".data/tokensList.json",
});

app.post("/api/challenge", (req, res) => {
  res.json(cap.createChallenge());
});

app.post("/api/redeem", async (req, res) => {
  const { token, solutions } = req.body;
  if (!token || !solutions) {
    return res.status(400).json({ success: false });
  }
  res.json(await cap.redeemChallenge({ token, solutions }));
});
// --- Fin Cap endpoints ---

// Servir archivos estáticos desde la carpeta uploads
const uploadsPath = path.join(__dirname, "../../uploads");
console.log("Sirviendo archivos estáticos desde:", uploadsPath);
app.use("/uploads", express.static(uploadsPath));

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, "../public")));

// Rutas de autenticación (deben ir antes del middleware de autenticación)
app.use("/api/auth", authRouter); // Rutas de autenticación
app.use("/api/password", passwordRouter); // Password reset (public, no auth required)

// Rutas de la API (las rutas públicas deben ir antes que las protegidas)
// Registrar rutas públicas CON y SIN el prefijo /api para compatibilidad
app.use("/api/posts/public", postsPublicRouter); // Ruta pública para posts (sin autenticación)
app.use("/posts/public", postsPublicRouter); // Sin prefijo /api para frontend Nuxt
app.use("/api/categories/public", categoriesPublicRouter); // Ruta pública para categorías (sin autenticación)
app.use("/categories/public", categoriesPublicRouter); // Sin prefijo /api
app.use("/api/menu/public", menuPublicRouter); // Ruta pública para menú (sin autenticación)
app.use("/menu/public", menuPublicRouter); // Sin prefijo /api
app.use("/api/settings/public", settingsPublicRouter); // Ruta pública para configuración (sin autenticación)
app.use("/settings/public", settingsPublicRouter); // Sin prefijo /api
app.use("/api/tags/public", tagsPublicRouter); // Ruta pública para tags (sin autenticación)
app.use("/tags/public", tagsPublicRouter); // Sin prefijo /api

// Subscriber public routes (magic link auth, no JWT required)
app.use("/api/subscribers/public", subscribersPublicRouter);
app.use("/subscribers/public", subscribersPublicRouter);

// Subscriber authenticated routes (subscriber JWT)
app.use("/api/subscribers/auth", subscribersRouter);
app.use("/subscribers/auth", subscribersRouter);

// Middleware para verificar autenticación en rutas protegidas
const requireAuth = (req, res, next) => {
  // Lista de rutas que no requieren autenticación
  const publicPaths = [
    "/api/auth",
    "/api/posts/public",
    "/posts/public",
    "/api/categories/public",
    "/categories/public",
    "/api/menu/public",
    "/menu/public",
    "/api/settings/public",
    "/settings/public",
    "/api/pages/public",
    "/pages/public",
    "/api/search/public",
    "/search/public",
    "/api/series/public",
    "/series/public",
    "/api/tags/public",
    "/tags/public",
    "/uploads",
    "/api/password",
    "/api/auth/login",
    "/api/subscribers/public",
    "/subscribers/public",
    "/api/subscribers/auth",
    "/subscribers/auth",
  ];

  // Verificar si la ruta actual está en la lista de rutas públicas (comparación robusta)
  const isPublicPath = publicPaths.some(
    (path) =>
      req.originalUrl === path ||
      req.originalUrl.startsWith(path + "/") ||
      req.originalUrl.startsWith(path + "?")
  );

  if (isPublicPath) {
    return next();
  }

  return authenticateToken(req, res, next);
};

// Importar y usar los nuevos endpoints públicos
// Routers públicos (deben ir antes del middleware de autenticación)
import pagesPublicRouter from "./routes/pages-public.js";
import searchPublicRouter from "./routes/search-public.js";
import seriesPublicRouter from "./routes/series-public.js";

// Las rutas públicas ya están registradas arriba (líneas 709-713)
// Solo necesitamos registrar las nuevas rutas públicas aquí
app.use("/api/pages/public", pagesPublicRouter);
app.use("/pages/public", pagesPublicRouter); // Sin prefijo /api
app.use("/api/search/public", searchPublicRouter);
app.use("/search/public", searchPublicRouter); // Sin prefijo /api
app.use("/api/series/public", seriesPublicRouter);
app.use("/series/public", seriesPublicRouter); // Sin prefijo /api

// Aplicar el middleware de autenticación a todas las rutas
// Middleware global de autenticación (debe ir después de todos los routers públicos, solo una vez)
app.use(requireAuth);
// Rutas protegidas
app.use("/api", statsRouter);
app.use("/api/blogs", blogsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/cms-pages", cmsPagesRouter); // Ruta para pages del CMS
app.use("/api/cms-posts", cmsPostsRouter); // Ruta para posts del CMS
app.use("/api/comments", commentsRouter);
app.use("/api/media", mediaRouter); // Rutas de medios
app.use("/api/menu", menuRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/posts", postsRouter);
app.use("/api/profile-picture-test", profilePictureTestRouter); // Ruta para imágenes de perfil
app.use("/api/series", seriesRouter); // Ruta para series
app.use("/api/settings", settingsRouter); // Rutas de configuraciones
app.use("/api/stats", statsRouter); // Rutas de estadísticas
app.use("/api/tags", tagsRouter); // Rutas de tags
app.use("/api/users", userProfileRouter);

app.use("/api/api-keys", apiKeysRouter); // Gestión de API keys (CMS)
app.use("/api/subscriptions", subscriptionsRouter); // Añadir rutas de suscripciones
app.use("/api/payments", paymentRouter); // Añadir rutas de pagos
app.use("/api/subscriber-management", subscriberManagementRouter); // Gestión de suscriptores (CMS)
app.use("/api/integrations", integrationsRouter); // Integraciones (Patreon, etc.)


// Ejecutar la función de corrección de la base de datos antes de iniciar el servidor
(async () => {
  try {
    console.log(
      "Iniciando proceso de corrección de la base de datos antes de iniciar el servidor..."
    );
    await fixDatabase();

    // Iniciar el servidor después de corregir la base de datos
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
})();
