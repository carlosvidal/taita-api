import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Middleware para verificar si el usuario está autenticado
 */
export const authenticateUser = async (req, res, next) => {
  try {
    // Obtener el token del encabezado de autorización
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "No autorizado. Token no proporcionado" });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Decodificamos el token base64 para obtener el email (sistema actual)
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [email] = decoded.split('-');
      
      // Buscar el usuario en la base de datos
      const user = await prisma.admin.findUnique({
        where: { email }
      });
      
      if (!user) {
        return res.status(401).json({ error: "Usuario no encontrado" });
      }
      
      // Añadir el usuario a la solicitud para uso posterior
      req.user = user;
      next();
    } catch (error) {
      console.error("Error al verificar token:", error);
      return res.status(401).json({ error: "Token inválido" });
    }
  } catch (error) {
    console.error("Error en autenticación:", error);
    return res.status(500).json({ error: "Error en el servidor" });
  }
};

/**
 * Middleware para verificar si el usuario es administrador
 */
export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "No autorizado" });
  }
  
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: "Acceso denegado. Se requiere rol de administrador" });
  }
  
  next();
};

/**
 * Middleware para verificar si el usuario es el propietario del perfil o un administrador
 */
export const isProfileOwnerOrAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "No autorizado" });
    }
    
    const { uuid } = req.params;
    
    console.log('Verificando acceso al perfil:', { 
      requestedUuid: uuid, 
      userUuid: req.user.uuid, 
      userRole: req.user.role 
    });
    
    // Si el usuario es administrador, permitir acceso
    if (req.user.role === 'ADMIN') {
      console.log('Acceso permitido: usuario es administrador');
      return next();
    }
    
    // Si el usuario está intentando acceder a su propio perfil, permitir acceso
    if (req.user.uuid && req.user.uuid === uuid) {
      console.log('Acceso permitido: usuario accediendo a su propio perfil');
      return next();
    }
    
    // En cualquier otro caso, denegar acceso
    console.log('Acceso denegado: el usuario no tiene permisos para este perfil');
    return res.status(403).json({ error: "Acceso denegado. No tienes permiso para acceder a este perfil" });
  } catch (error) {
    console.error("Error en verificación de propiedad:", error);
    return res.status(500).json({ error: "Error en el servidor" });
  }
};
