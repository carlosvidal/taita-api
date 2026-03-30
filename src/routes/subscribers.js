import express from "express";
import authenticateSubscriber from "../middleware/authenticateSubscriber.js";
import { getProfile } from "../controllers/subscriberController.js";

const router = express.Router();

// All routes require subscriber JWT
router.use(authenticateSubscriber);

// GET /me — Subscriber profile
router.get("/me", getProfile);

export default router;
