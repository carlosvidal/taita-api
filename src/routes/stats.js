import express from "express";
const router = express.Router();
import { authenticateUser } from "../middleware/authMiddleware.js";
import {
  getPostsCount,
  getCategoriesCount,
  getPagesCount
} from "../controllers/statsController.js";

// Middleware de autenticación para todas las rutas de estadísticas
router.use(authenticateUser);

// Endpoints de estadísticas
router.get("/posts/count", getPostsCount);
router.get("/categories/count", getCategoriesCount);
router.get("/pages/count", getPagesCount);

// Manejador de errores global para las rutas de estadísticas
router.use((err, req, res, next) => {
  console.error('Error en ruta de estadísticas:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

export default router;
