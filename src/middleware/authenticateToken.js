import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export default function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      console.log('No se proporcionó el encabezado de autorización');
      return res.status(401).json({ 
        success: false, 
        error: 'Token de autenticación no proporcionado' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('Formato de token inválido');
      return res.status(401).json({ 
        success: false, 
        error: 'Formato de token inválido. Use: Bearer <token>' 
      });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.error('Error al verificar el token:', err.message);
        return res.status(403).json({ 
          success: false, 
          error: 'Token inválido o expirado' 
        });
      }
      
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Error en el middleware de autenticación:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error en el servidor durante la autenticación' 
    });
  }
}
