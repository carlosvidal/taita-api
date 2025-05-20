import { Router } from 'express';
import { getPublicTags, getPostsByTag } from '../controllers/tagController.js';

const router = Router();

// Ruta pública para obtener todos los tags
router.get("/", getPublicTags);

// Ruta pública para obtener posts por tag
router.get("/:slug/posts", getPostsByTag);

export default router;
