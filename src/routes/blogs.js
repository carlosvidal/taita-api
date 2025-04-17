// Rutas para crear y listar blogs
import express from 'express';
import { createBlog, listBlogs } from '../controllers/blogController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
const router = express.Router();

// Crear un nuevo blog
router.post('/', authenticateUser, createBlog);

// Listar blogs del usuario
router.get('/', authenticateUser, listBlogs);

export default router;
