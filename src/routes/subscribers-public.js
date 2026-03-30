import express from "express";
import {
  subscribe,
  verifyMagicLink,
} from "../controllers/subscriberController.js";

const router = express.Router();

// POST /subscribe — Register or re-send magic link
router.post("/subscribe", subscribe);

// GET /verify-magic-link/:token — Verify magic link, return JWT
router.get("/verify-magic-link/:token", verifyMagicLink);

export default router;
