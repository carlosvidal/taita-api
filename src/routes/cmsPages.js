import express from 'express';
import { createPage, updatePage } from '../controllers/cmsPageController.js';

const router = express.Router();

// Rutas específicas para páginas del CMS
router.post('/', createPage);
router.put('/:uuid', updatePage);

export default router;
