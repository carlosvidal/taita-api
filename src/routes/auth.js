import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Ruta de login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Buscar el usuario en la base de datos
    const user = await prisma.admin.findUnique({
      where: { email }
    });
    
    // Verificar si el usuario existe y la contraseña es correcta
    // En un sistema real, deberías usar bcrypt para comparar contraseñas hasheadas
    if (user && user.password === password) {
      // Generar un token simple (en producción usarías JWT)
      const token = Buffer.from(`${email}-${Date.now()}`).toString('base64');
      
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
      error: 'Error en el servidor'
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
