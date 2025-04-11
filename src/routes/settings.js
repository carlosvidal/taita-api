import express from "express";
const router = express.Router();
import { getSettings, updateSettings } from "../controllers/settingsController.js";

router.get("/", getSettings);
router.put("/", updateSettings);

export default router;
