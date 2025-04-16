import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
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
import userProfileRouter from "./routes/userProfile.js";
import seriesRouter from "./routes/series.js";
import profilePictureTestRouter from "./routes/profilePictureTest.js";
import commentsRouter from "./routes/comments.js";
import { addDebugRoutes } from "./controllers/commentsController.js";

dotenv.config();

// Configurar __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
addDebugRoutes(app);

// Configuración CORS actualizada para permitir peticiones desde ambos puertos
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:4321",
    "http://localhost:4322",
    "http://localhost:4323",
  ], // Permitir ambos puertos
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

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
app.use("/api/pages", pagesRouter);
app.use("/api/menu", menuRouter);
app.use("/api/series", seriesRouter); // Nueva ruta para series
app.use("/api/users", userProfileRouter);
app.use("/api/profile-picture-test", profilePictureTestRouter); // Nueva ruta para imágenes de perfil
app.use("/api/comments", commentsRouter);
app.use("/api", statsRouter);
app.use("/api", authRouter); // Añadir rutas de autenticación
app.use("/api/media", mediaRouter); // Añadir rutas de medios
app.use("/api/settings", settingsRouter); // Añadir rutas de configuraciones

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
