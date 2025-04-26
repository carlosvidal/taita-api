import express from "express";
import { handlePaymentNotification } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/notifications", handlePaymentNotification);

export default router;
