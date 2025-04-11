import express from "express";
const router = express.Router();
import {
  getPostsCount,
  getCategoriesCount,
} from "../controllers/statsController.js";

// Endpoints de estadísticas
router.get("/posts/count", getPostsCount);
router.get("/categories/count", getCategoriesCount);

export default router;
