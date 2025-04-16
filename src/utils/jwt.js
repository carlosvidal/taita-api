import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_EXPIRATION = '10m'; // 10 minutos

export function signCommentToken(email) {
  return jwt.sign({ email, type: 'commenter' }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

export function verifyCommentToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
