import express from "express";
const router = express.Router();
import {
  getSettings,
  updateSettings,
} from "../controllers/settingsController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/isAdminMiddleware.js";

router.get("/", authenticateUser, isAdmin, getSettings);
router.put("/", authenticateUser, isAdmin, updateSettings);

export default router;
