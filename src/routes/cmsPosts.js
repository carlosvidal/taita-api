import express from 'express';
import { createPost } from '../controllers/cmsPostController.js';

const router = express.Router();

// Ruta específica para crear posts desde el CMS
router.post('/', createPost);

export default router;
