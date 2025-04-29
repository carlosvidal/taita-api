import express from "express";
import { requestPasswordReset, resetPassword } from "../controllers/passwordController.js";

const router = express.Router();

router.post("/forgot", requestPasswordReset);
router.post("/reset", resetPassword);

export default router;
