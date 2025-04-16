// Controlador de comentarios: lógica principal y anti-spam
import { PrismaClient } from '@prisma/client';
import { signCommentToken, verifyCommentToken } from '../utils/jwt.js';
const prisma = new PrismaClient();
const rateLimitMap = new Map();

// SOLO PARA DESARROLLO: ruta para limpiar el rate limit y OTPs
export function addDebugRoutes(app) {
  if (process.env.NODE_ENV !== 'production') {
    app.post('/api/debug/clear-comments-rate-limit', (req, res) => {
      rateLimitMap.clear();
      otpStore.clear();
      res.json({ ok: true, message: 'Rate limit y OTPs limpiados' });
    });
  }
}

// Configuración básica
const OTP_CODE = '123456'; // Simulado
const OTP_EXPIRATION = 10 * 60 * 1000; // 10 minutos
const SUSPICIOUS_WORDS = ['spam', 'casino', 'viagra', 'http://', 'https://'];
const SUSPICIOUS_REGEX = [/\b(?:free money|click here)\b/i];

// Simulación de almacenamiento de OTPs
const otpStore = new Map(); // email -> { code, expiresAt }

function isSpam(content) {
  for (const word of SUSPICIOUS_WORDS) {
    if (content.toLowerCase().includes(word)) return true;
  }
  for (const regex of SUSPICIOUS_REGEX) {
    if (regex.test(content)) return true;
  }
  return false;
}

export const createComment = async (req, res) => {
  console.log('[Comentarios] Body recibido:', req.body);
  // 0. Extraer JWT
  let token = req.headers.authorization;
  if (token && token.startsWith('Bearer ')) token = token.slice(7);
  else token = req.body.token;
  const payload = verifyCommentToken(token);
  console.log('[Comentarios] JWT recibido:', token, '| payload:', payload);
  if (!payload || !payload.email) {
    return res.status(401).json({ error: 'No autorizado: token inválido o expirado' });
  }

  const { postId, pageId, authorName, content, honeypot } = req.body;
  const authorEmail = payload.email;
  const ip = req.ip;

  // 1. Honeypot
  if (honeypot && honeypot.trim() !== '') {
    return res.status(400).json({ error: 'Spam detected (honeypot)' });
  }

  // 3. Rate limit por IP
  const lastTime = rateLimitMap.get(ip);
  console.log('[Comentarios] IP:', ip, 'Último comentario:', lastTime, 'Ahora:', Date.now());
  if (lastTime && Date.now() - lastTime < 60 * 1000) {
    console.warn('[Comentarios] Rate limit activado para IP:', ip);
    return res.status(429).json({ error: 'Solo puedes comentar 1 vez por minuto.' });
  }
  rateLimitMap.set(ip, Date.now());

  // 4. Filtro de palabras y patrones
  const isSuspect = isSpam(content);

  try {
    console.log('[Comentarios] Guardando comentario en base de datos...');
    const comment = await prisma.comment.create({
      data: {
        post: postId ? { connect: { id: postId } } : undefined,
        authorName,
        authorEmail,
        content,
        ip,
        isSuspect,
        honeypot,
        status: isSuspect ? 'PENDING' : 'APPROVED',
      },
    });
    return res.json({ success: true, comment });
  } catch (err) {
    console.error('[Comentarios] Error al guardar comentario:', err);
    console.error('[Comentarios] Error details:', JSON.stringify(err, null, 2));
    return res.status(500).json({ error: 'Error al guardar el comentario', details: err.message, stack: err.stack });
  }
};

export const listComments = async (req, res) => {
  const { postId, pageId, status } = req.query;
  const where = {};
  if (postId) where.postId = Number(postId);
  if (pageId) where.pageId = Number(pageId);
  if (status) where.status = status;
  try {
    const comments = await prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            title: true,
            uuid: true
          }
        }
      }
    });
    return res.json(comments);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener comentarios' });
  }
};

export const approveComment = async (req, res) => {
  const { uuid } = req.params;
  try {
    const comment = await prisma.comment.update({ where: { uuid }, data: { status: 'APPROVED' } });
    return res.json({ success: true, comment });
  } catch (err) {
    return res.status(404).json({ error: 'Comentario no encontrado' });
  }
};

export const rejectComment = async (req, res) => {
  const { uuid } = req.params;
  try {
    const comment = await prisma.comment.update({ where: { uuid }, data: { status: 'REJECTED' } });
    return res.json({ success: true, comment });
  } catch (err) {
    return res.status(404).json({ error: 'Comentario no encontrado' });
  }
};

export const markSpamComment = async (req, res) => {
  const { uuid } = req.params;
  try {
    const comment = await prisma.comment.update({ where: { uuid }, data: { status: 'SPAM' } });
    return res.json({ success: true, comment });
  } catch (err) {
    return res.status(404).json({ error: 'Comentario no encontrado' });
  }
};

export const requestOtp = async (req, res) => {
  console.log('[Comentarios] [ROUTE] /comments/request-otp llamado con body:', req.body);
  console.log('[Comentarios] requestOtp - email recibido:', req.body.email);

  const { email } = req.body;
  // Simular envío de OTP
  otpStore.set(email, { code: OTP_CODE, expiresAt: Date.now() + OTP_EXPIRATION });
  console.log('[Comentarios] requestOtp - OTP guardado:', OTP_CODE, 'para', email);
  return res.json({ success: true, message: 'OTP enviado (simulado)', code: OTP_CODE });
};

export const verifyOtp = async (req, res) => {
  console.log('[Comentarios] [ROUTE] /comments/verify-otp llamado con body:', req.body);
  console.log('[Comentarios] verifyOtp - email:', req.body.email, 'code recibido:', req.body.code);

  const { email, code } = req.body;
  const otpData = otpStore.get(email);
  console.log('[Comentarios] verifyOtp - OTP esperado:', otpData ? otpData.code : undefined, '| Expira en:', otpData ? otpData.expiresAt - Date.now() : undefined);
  if (otpData && otpData.code === code && Date.now() < otpData.expiresAt) {
    console.log('[Comentarios] verifyOtp - OTP válido');
    const token = signCommentToken(email);
    return res.json({ success: true, token });
  }
  console.warn('[Comentarios] verifyOtp - OTP inválido o expirado');
  return res.status(401).json({ error: 'OTP inválido o expirado' });
};
