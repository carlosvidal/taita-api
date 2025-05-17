import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Ruta de login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Intentando login para:', email);
    
    // Buscar el usuario en la base de datos
    const user = await prisma.admin.findUnique({
      where: { email }
    });
    console.log('Usuario encontrado:', user ? { id: user.id, email: user.email, password: user.password } : null);
    let passwordMatch = false;
    if (user) {
      passwordMatch = await bcrypt.compare(password, user.password);
      console.log('Resultado bcrypt.compare:', passwordMatch);
    }
    
    // Verificar si el usuario existe y la contraseña es correcta (bcrypt)
    if (user && passwordMatch) {
      // Generar un JWT
      const token = jwt.sign(
        { id: user.id, uuid: user.uuid, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Credenciales inválidas'
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error en el servidor durante la autenticación'
    });
  }
});

// Ruta para verificar el token
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  // En un sistema real, verificarías la validez del token
  // Por ahora, simplemente asumimos que es válido si existe
  
  return res.status(200).json({
    success: true,
    message: 'Token válido'
  });
});

export default router;
