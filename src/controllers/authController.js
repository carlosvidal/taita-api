import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// OTP Simulado
const OTP_CODE = '123456';
const OTP_EXPIRATION = 10 * 60 * 1000; // 10 minutos
const otpStore = new Map(); // email -> { code, expiresAt, verified }

export const requestOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requerido" });
  otpStore.set(email, { code: OTP_CODE, expiresAt: Date.now() + OTP_EXPIRATION, verified: false });
  return res.json({ success: true, message: 'OTP enviado (simulado)', code: OTP_CODE });
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
