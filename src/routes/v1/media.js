import express from "express";
import multer from "multer";
import authenticateApiKey from "../../middleware/authenticateApiKey.js";
import { uploadImage, uploadImageFromUrl, getMedia, deleteMedia } from "../../controllers/mediaController.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for API uploads
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

/**
 * POST /api/v1/media/upload
 * Upload an image file (multipart/form-data)
 */
router.post(
  "/upload",
  authenticateApiKey("media:write"),
  upload.single('image'),
  uploadImage
);

/**
 * POST /api/v1/media/upload-url
 * Upload an image from a public URL
 * Body: { url: string, filename?: string }
 */
router.post(
  "/upload-url",
  authenticateApiKey("media:write"),
  uploadImageFromUrl
);

/**
 * GET /api/v1/media
 * List media for the blog
 */
router.get("/", authenticateApiKey("media:read"), getMedia);

/**
 * DELETE /api/v1/media/:id
 * Delete a media item
 */
router.delete("/:id", authenticateApiKey("media:write"), deleteMedia);

export default router;
