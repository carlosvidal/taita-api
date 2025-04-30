// controllers/emailController.js
import { isBurnerEmail, getEmailType, extractDomain } from "../utils/burnerEmailChecker.js";

/**
 * POST /api/emails/verify
 * Body: { email: string }
 * Responde con información sobre el tipo de email y dominio
 * Pensado para uso interno/asíncrono
 */
export const verifyEmailType = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requerido" });
  const domain = extractDomain(email);
  if (!domain) return res.status(400).json({ error: "Formato de email inválido" });
  const isBurner = isBurnerEmail(email);
  const emailType = getEmailType(email);
  // Futuro: Aquí se puede integrar validación externa asíncrona
  res.json({
    email,
    domain,
    isBurnerEmail: isBurner,
    emailType,
    verified: false, // Para integración futura
    checkedAt: new Date().toISOString(),
  });
};
