import express from "express";
import dotenv from "dotenv";
import Cap from "@cap.js/server";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import categoriesRouter from "./routes/categories.js";
import postsRouter from "./routes/posts.js";
import cmsPostsRouter from "./routes/cmsPosts.js";
import cmsPagesRouter from "./routes/cmsPages.js";
import pagesRouter from "./routes/pages.js";
import menuRouter from "./routes/menu.js";
import statsRouter from "./routes/stats.js";
import authRouter from "./routes/auth.js";
import mediaRouter from "./routes/media.js";
import settingsRouter from "./routes/settings.js";
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
    // Dominios de Render.com
    "https://taita-frontend.onrender.com",
    "https://taita-api.onrender.com",
    "https://taita-cms.onrender.com",
  ];

  // Si no hay origen o es un entorno de desarrollo, permitir
  if (!origin || devOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, PUT, POST, DELETE, OPTIONS"
    );
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    return next();
  }

  // Si es uno de los dominios principales, permitir
  if (mainDomains.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header(
      "Access-Control-Allow-Methods",
      "GET, PUT, POST, DELETE, OPTIONS"
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
        "GET, PUT, POST, DELETE, OPTIONS"
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
app.use("/api/posts", postsRouter);
app.use("/api/cms-posts", cmsPostsRouter); // Nueva ruta para posts del CMS
app.use("/api/cms-pages", cmsPagesRouter); // Nueva ruta para pages del CMS
app.use("/api/categories", categoriesRouter);
app.use("/api/blogs", blogsRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/menu", menuRouter);
app.use("/api/series", seriesRouter); // Nueva ruta para series
app.use("/api/users", userProfileRouter);
app.use("/api/profile-picture-test", profilePictureTestRouter); // Nueva ruta para imágenes de perfil
app.use("/api/comments", commentsRouter);
app.use("/api", statsRouter);
app.use("/api/auth", authRouter); // Añadir rutas de autenticación
app.use("/api/media", mediaRouter); // Añadir rutas de medios
app.use("/api/settings", settingsRouter); // Añadir rutas de configuraciones

// Importar y usar las nuevas rutas de suscripciones y pagos
import subscriptionsRouter from "./routes/subscriptions.js";
import paymentRouter from "./routes/paymentRoutes.js";
app.use("/api/subscriptions", subscriptionsRouter); // Añadir rutas de suscripciones
app.use("/api/payments", paymentRouter); // Añadir rutas de pagos

// Importar y usar las nuevas rutas de recuperación de contraseña
import passwordRouter from "./routes/password.js";
app.use("/api/password", passwordRouter); // Añadir rutas de recuperación de contraseña

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
