import express from "express";
import {
  getSubscriptionStatus,
  createPaymentPreference,
} from "../controllers/subscriptionController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = express.Router();

// Ruta para obtener el estado de la suscripción del usuario actual
router.get("/status", authenticateJWT, getSubscriptionStatus);

// Ruta para crear una preferencia de pago con MercadoPago
router.post("/create-preference", authenticateJWT, createPaymentPreference);


export default router;
