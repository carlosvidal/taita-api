import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { sendMail } from "../utils/mailer.js";

const prisma = new PrismaClient();

// 1. Solicitud de recuperación: genera token y envía email
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  const user = await prisma.admin.findUnique({ where: { email } });
  if (!user) {
    // No reveles si el email existe
    return res.status(200).json({ message: "Si el email existe, se enviará un enlace de recuperación." });
  }

  // Genera token y guarda con expiración (1h)
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.upsert({
    where: { userId: user.id },
    update: { token, expiresAt: expires },
    create: { userId: user.id, token, expiresAt: expires },
  });

  // Envía email
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: "Recupera tu contraseña",
    html: `<p>Haz clic <a href="${resetUrl}">aquí</a> para restablecer tu contraseña. Este enlace es válido por 1 hora.</p>` ,
    text: `Visita este enlace para restablecer tu contraseña: ${resetUrl}`,
  });

  res.status(200).json({ message: "Si el email existe, se enviará un enlace de recuperación." });
};

// 2. Restablecer contraseña usando el token
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Datos requeridos" });

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    return res.status(400).json({ error: "Token inválido o expirado" });
  }

  // Actualiza contraseña (usa bcrypt)
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(password, 10);
  await prisma.admin.update({ where: { id: record.userId }, data: { password: hash } });

  // Elimina el token usado
  await prisma.passwordResetToken.delete({ where: { token } });

  res.status(200).json({ message: "Contraseña actualizada correctamente" });
};
