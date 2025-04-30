import express from "express";
import { verifyEmailType } from "../controllers/emailController.js";

const router = express.Router();

// POST /api/emails/verify
router.post("/verify", verifyEmailType);

export default router;
