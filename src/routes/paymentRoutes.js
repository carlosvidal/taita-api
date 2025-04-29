import express from "express";
import {
  handlePaymentNotification,
  processPayment,
  getPaymentStatus,
} from "../controllers/paymentController.js";
import { authenticateJWT } from "../middleware/authMiddleware.js";

const router = express.Router();

// Ruta para procesar pagos
router.post("/process", authenticateJWT, processPayment);

// Ruta para obtener el estado de un pago
router.get("/status/:paymentId", authenticateJWT, getPaymentStatus);

// Ruta para recibir notificaciones de pago
router.post("/notifications", handlePaymentNotification);

export default router;
