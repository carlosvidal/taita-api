import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// OTP Simulado
const OTP_CODE = '123456';
const OTP_EXPIRATION = 10 * 60 * 1000; // 10 minutos
const otpStore = new Map(); // email -> { code, expiresAt, verified }

import { sendMail } from "../utils/mailer.js";

export const requestOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  // Genera un OTP aleatorio de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { code, expiresAt: Date.now() + OTP_EXPIRATION, verified: false });

  // Envía el OTP por email
  try {
    await sendMail({
      to: email,
      subject: "Tu código de verificación (OTP) para Taita Blog",
      html: `<p>Tu código de verificación es: <b>${code}</b>. Es válido por 10 minutos.</p>`,
      text: `Tu código de verificación es: ${code}. Es válido por 10 minutos.`,
    });
    return res.json({ success: true, message: 'OTP enviado a tu correo electrónico' });
  } catch (error) {
    console.error("Error enviando OTP:", error);
    return res.status(500).json({ error: "No se pudo enviar el OTP. Intenta nuevamente." });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, code } = req.body;
  const otpData = otpStore.get(email);
  if (otpData && otpData.code === code && Date.now() < otpData.expiresAt) {
    otpData.verified = true;
    return res.json({ success: true, message: 'OTP verificado' });
  }
  return res.status(401).json({ error: 'OTP inválido o expirado' });
};

export const signup = async (req, res) => {
  const { email, password, name, blogName, subdomain } = req.body;
  if (!email || !password || !name || !blogName || !subdomain) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }
  // Verifica OTP
  const otpData = otpStore.get(email);
  if (!otpData || !otpData.verified) {
    return res.status(401).json({ error: "OTP no verificado para este email" });
  }
  try {
    // Verifica que el email y subdominio no existan
    const existingUser = await prisma.admin.findUnique({ where: { email } });
    const existingBlog = await prisma.blog.findFirst({ where: { subdomain } });
    if (existingUser) return res.status(409).json({ error: "Email ya registrado" });
    if (existingBlog) return res.status(409).json({ error: "Subdominio no disponible" });
    // Crea el usuario
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "ADMIN"
      }
    });
    // Crea el blog asociado
    const blog = await prisma.blog.create({
      data: {
        name: blogName,
        subdomain,
        plan: "FREE",
        adminId: user.id,
        title: blogName,
        template: "default",
        language: "es"
      }
    });
    // (Opcional) Genera un token JWT
    const token = jwt.sign({ userId: user.id, blogId: blog.id }, process.env.JWT_SECRET || 'supersecret', { expiresIn: "7d" });
    otpStore.delete(email); // Limpia OTP tras registro
    res.json({ user, blog, token });
  } catch (error) {
    console.error("Error en signup:", error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
};
