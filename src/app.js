import express from "express";
import dotenv from "dotenv";
import Cap from "@cap.js/server";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import categoriesRouter from "./routes/categories.js";
import categoriesPublicRouter from "./routes/categories-public.js";
import postsRouter from "./routes/posts.js";
import postsPublicRouter from "./routes/posts-public.js";
import cmsPostsRouter from "./routes/cmsPosts.js";
import cmsPagesRouter from "./routes/cmsPages.js";
import pagesRouter from "./routes/pages.js";
import menuRouter from "./routes/menu.js";
import menuPublicRouter from "./routes/menu-public.js";
import statsRouter from "./routes/stats.js";
import authRouter from "./routes/auth.js";
import mediaRouter from "./routes/media.js";
import settingsRouter from "./routes/settings.js";
import settingsPublicRouter from "./routes/settings-public.js";
import blogsRouter from "./routes/blogs.js";
import userProfileRouter from "./routes/userProfile.js";
import seriesRouter from "./routes/series.js";
import profilePictureTestRouter from "./routes/profilePictureTest.js";
import commentsRouter from "./routes/comments.js";
import emailsRouter from "./routes/emails.js";
import { addDebugRoutes } from "./controllers/commentsController.js";

dotenv.config();

// Configurar __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar Prisma
const prisma = new PrismaClient();

// Función para corregir la base de datos
async function fixDatabase() {
  console.log('Iniciando corrección de la base de datos...');

  try {
    // 1. Verificar y obtener el usuario admin
    let admin = await prisma.admin.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (!admin) {
      console.log('No se encontró un usuario SUPER_ADMIN. Creando uno nuevo...');
      
      // Crear un nuevo admin si no existe
      const hashedPassword = await bcrypt.hash('securepassword', 10);
      
      admin = await prisma.admin.create({
        data: {
          uuid: uuidv4(),
          email: 'admin@example.com',
          password: hashedPassword,
          name: 'Admin User',
          role: 'SUPER_ADMIN'
        }
      });
      console.log(`Nuevo admin creado: ${admin.name} (${admin.email})`);
    } else {
      console.log(`Admin encontrado: ${admin.name} (${admin.email})`);
    }

    // 2. Verificar blogs existentes
    const existingBlogs = await prisma.blog.findMany();
    console.log(`Se encontraron ${existingBlogs.length} blogs en la base de datos`);

    // 3. Procesar cada blog existente
    for (const blog of existingBlogs) {
      console.log(`Procesando blog ID ${blog.id}: ${blog.name || 'Sin nombre'}`);
      
      // Verificar si el blog tiene UUID
      if (!blog.uuid) {
        await prisma.blog.update({
          where: { id: blog.id },
          data: { uuid: uuidv4() }
        });
        console.log(`- Asignado nuevo UUID al blog ID ${blog.id}`);
      }
      
      // Verificar si el blog está asociado a un admin
      if (!blog.adminId) {
        await prisma.blog.update({
          where: { id: blog.id },
          data: { adminId: admin.id }
        });
        console.log(`- Asociado blog ID ${blog.id} al admin ID ${admin.id}`);
      }
      
      // Verificar si el blog tiene subdominio
      if (!blog.subdomain) {
        const subdomain = blog.name 
          ? blog.name.toLowerCase().replace(/[^a-z0-9]/g, '') 
          : `blog${blog.id}`;
        
        await prisma.blog.update({
          where: { id: blog.id },
          data: { subdomain }
        });
        console.log(`- Asignado subdominio "${subdomain}" al blog ID ${blog.id}`);
      }
      
      // Verificar si el blog tiene plan
      if (!blog.plan) {
        await prisma.blog.update({
          where: { id: blog.id },
          data: { plan: 'FREE' }
        });
        console.log(`- Asignado plan "FREE" al blog ID ${blog.id}`);
      }
      
      // Verificar si el blog tiene categorías
      const categories = await prisma.category.findMany({
        where: { blogId: blog.id }
      });
      
      if (categories.length === 0) {
        await prisma.category.createMany({
          data: [
            { name: "Tecnología", slug: "tecnologia", blogId: blog.id },
            { name: "Vida", slug: "vida", blogId: blog.id },
            { name: "Noticias", slug: "noticias", blogId: blog.id }
          ]
        });
        console.log(`- Creadas categorías para el blog ID ${blog.id}`);
      } else {
        console.log(`- El blog ID ${blog.id} ya tiene ${categories.length} categorías`);
      }
    }

    // 4. Si no hay blogs, crear uno nuevo
    if (existingBlogs.length === 0) {
      console.log('No se encontraron blogs. Creando un blog de ejemplo...');
      
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
          socialNetworks: { twitter: "", facebook: "", instagram: "" }
        }
      });
      
      console.log(`Nuevo blog creado con ID: ${newBlog.id} y UUID: ${newBlog.uuid}`);
      
      // Crear categorías para el nuevo blog
      await prisma.category.createMany({
        data: [
          { name: "Tecnología", slug: "tecnologia", blogId: newBlog.id },
          { name: "Vida", slug: "vida", blogId: newBlog.id },
          { name: "Noticias", slug: "noticias", blogId: newBlog.id }
        ]
      });
      
      console.log('Categorías creadas para el nuevo blog');
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
          select: { categories: true }
        }
      }
    });
    
    console.log('\nBlogs disponibles después de las correcciones:');
    console.log(allBlogs.map(blog => ({
      id: blog.id,
      uuid: blog.uuid,
      name: blog.name,
      subdomain: blog.subdomain,
      adminId: blog.adminId,
      categories: blog._count.categories
    })));
    
    console.log('\nProceso de corrección de base de datos completado con éxito');
    return true;
  } catch (error) {
    console.error('Error durante el proceso de corrección de la base de datos:', error);
    return false;
  }
}

const app = express();
const port = process.env.PORT || 3000;
addDebugRoutes(app);

// Configuración CORS dinámica que consulta la base de datos
const dynamicCorsMiddleware = async (req, res, next) => {
  const origin = req.headers.origin;

  // Permitir siempre en desarrollo
  const devOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:4321",
    "http://localhost:4322",
    "http://localhost:4323",
  ];

  // Dominios principales siempre permitidos
  const mainDomains = [
    "https://taita.blog",
    "https://www.taita.blog",
    "https://cms.taita.blog",
    "https://super-admin.taita.blog",
    // Dominios de Render.com
    "https://taita-frontend.onrender.com",
    "https://taita-api.onrender.com",
    "https://taita-cms.onrender.com",
  ];
  
  // Función para verificar si un origen es un subdominio de taita.blog
  const isTaitaSubdomain = (origin) => {
    try {
      const hostname = new URL(origin).hostname;
      return hostname.endsWith('.taita.blog') || hostname === 'taita.blog';
    } catch (error) {
      return false;
    }
  };

  // Si no hay origen o es un entorno de desarrollo, permitir
  if (!origin || devOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, PUT, POST, DELETE, PATCH, OPTIONS"
    );
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    return next();
  }

  // Si es uno de los dominios principales o un subdominio de taita.blog, permitir
  if (mainDomains.includes(origin) || isTaitaSubdomain(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header(
      "Access-Control-Allow-Methods",
      "GET, PUT, POST, DELETE, PATCH, OPTIONS"
    );
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    return next();
  }

  try {
    // Extraer el subdominio del origen
    let hostname = new URL(origin).hostname;
    let subdomain = hostname.split(".")[0];

    // Buscar en la base de datos si existe un blog con este subdominio
    const blog = await prisma.blog.findFirst({
      where: { subdomain: subdomain },
    });

    if (blog) {
      // Si existe el blog, permitir el acceso
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, PUT, POST, DELETE, PATCH, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");

      console.log(
        `CORS: Permitiendo acceso desde ${origin} (subdominio: ${subdomain})`
      );
    } else {
      // Si no existe, registrar el intento
      console.log(
        `CORS: Bloqueando acceso desde ${origin} (subdominio: ${subdomain} no encontrado)`
      );
    }
  } catch (error) {
    console.error("Error verificando CORS:", error);
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
};

import cors from "cors";

// Aplicar el middleware CORS dinámico
app.use(dynamicCorsMiddleware);
app.use(express.json());

// Endpoint interno de verificación de emails
app.use("/api/emails", emailsRouter);

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

// Rutas de la API
app.use("/api/posts/public", postsPublicRouter); // Ruta pública para posts (sin autenticación)
app.use("/api/posts", postsRouter);
app.use("/api/cms-posts", cmsPostsRouter); // Nueva ruta para posts del CMS
app.use("/api/cms-pages", cmsPagesRouter); // Nueva ruta para pages del CMS
app.use("/api/categories", categoriesRouter);
app.use("/api/categories/public", categoriesPublicRouter); // Ruta pública para categorías (sin autenticación)
app.use("/api/blogs", blogsRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/menu", menuRouter);
app.use("/api/menu/public", menuPublicRouter); // Ruta pública para menú (sin autenticación)
app.use("/api/series", seriesRouter); // Nueva ruta para series
app.use("/api/users", userProfileRouter);
app.use("/api/profile-picture-test", profilePictureTestRouter); // Nueva ruta para imágenes de perfil
app.use("/api/comments", commentsRouter);
app.use("/api", statsRouter);
app.use("/api/auth", authRouter); // Añadir rutas de autenticación
app.use("/api/media", mediaRouter); // Añadir rutas de medios
app.use("/api/settings", settingsRouter);
app.use("/api/settings/public", settingsPublicRouter); // Ruta pública para configuración (sin autenticación) // Añadir rutas de configuraciones

// Importar y usar las nuevas rutas de suscripciones y pagos
import subscriptionsRouter from "./routes/subscriptions.js";
import paymentRouter from "./routes/paymentRoutes.js";
app.use("/api/subscriptions", subscriptionsRouter); // Añadir rutas de suscripciones
app.use("/api/payments", paymentRouter); // Añadir rutas de pagos

// Importar y usar las nuevas rutas de recuperación de contraseña
import passwordRouter from "./routes/password.js";
app.use("/api/password", passwordRouter); // Añadir rutas de recuperación de contraseña

// Ejecutar la función de corrección de la base de datos antes de iniciar el servidor
(async () => {
  try {
    console.log('Iniciando proceso de corrección de la base de datos antes de iniciar el servidor...');
    await fixDatabase();
    
    // Iniciar el servidor después de corregir la base de datos
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
})();
