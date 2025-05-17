import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

/**
 * Middleware para verificar si el usuario está autenticado
 */
const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "No autorizado. Token no proporcionado" });
    }

    const token = authHeader.split(" ")[1];

    try {
      // Verificar el token JWT
      // Verificar que el token tenga el formato correcto
      if (
        !token ||
        typeof token !== "string" ||
        token.split(".").length !== 3
      ) {
        return res.status(401).json({ error: "Formato de token JWT inválido" });
      }
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "supersecretkey",
        { complete: true }
      );

      if (!decoded || !decoded.payload || !decoded.payload.id) {
        return res.status(401).json({ error: "Token JWT inválido" });
      }

      // Buscar el usuario en la base de datos
      const user = await prisma.admin.findUnique({
        where: { id: decoded.payload.id },
      });

      if (!user) {
        return res.status(401).json({ error: "Usuario no encontrado" });
      }

      // Añadir el usuario a la solicitud para uso posterior
      req.user = user;
      next();
    } catch (error) {
      console.error("Error al verificar token JWT:", error);
      return res.status(401).json({ error: "Token JWT inválido" });
    }
  } catch (error) {
    console.error("Error en autenticación JWT:", error);
    return res.status(401).json({ error: "Token JWT inválido" });
  }
};

const authenticateUser = async (req, res, next) => {
  try {
    // Obtener el token del encabezado de autorización
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log('No se proporcionó token de autenticación');
      return res.status(401).json({ 
        success: false,
        error: "No autorizado. Token no proporcionado" 
      });
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
      console.log('Formato de token inválido');
      return res.status(401).json({ 
        success: false,
        error: "Formato de token inválido. Use: Bearer <token>" 
      });
    }

    try {
      // Verificar el token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
      
      if (!decoded || !decoded.id) {
        console.log('Token JWT inválido: falta el ID de usuario');
        return res.status(401).json({ 
          success: false,
          error: "Token JWT inválido" 
        });
      }
      
      // Buscar el usuario en la base de datos usando el id del payload
      const user = await prisma.admin.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          uuid: true
        }
      });

      if (!user) {
        console.log(`Usuario no encontrado para el ID: ${decoded.id}`);
        return res.status(401).json({ 
          success: false,
          error: "Usuario no encontrado" 
        });
      }

      // Añadir el usuario a la solicitud para uso posterior
      req.user = user;
      next();
    } catch (error) {
      console.error("Error al verificar token JWT:", error);
      
      let errorMessage = "Token inválido o expirado";
      if (error.name === 'TokenExpiredError') {
        errorMessage = "La sesión ha expirado. Por favor, inicia sesión nuevamente.";
      } else if (error.name === 'JsonWebTokenError') {
        errorMessage = "Token inválido";
      }
      
      return res.status(401).json({ 
        success: false,
        error: errorMessage 
      });
    }
  } catch (error) {
    console.error("Error en autenticación:", error);
    return res.status(500).json({ 
      success: false,
      error: "Error en el servidor durante la autenticación" 
    });
  }
};

/**
 * Middleware para verificar si el usuario es administrador
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "No autorizado" });
  }

  if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
    return res
      .status(403)
      .json({ error: "Acceso denegado. Se requiere rol de administrador o super administrador" });
  }

  next();
};

/**
 * Middleware para verificar si el usuario es el propietario del perfil o un administrador
 */
const isProfileOwnerOrAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const { uuid } = req.params;

    console.log("Verificando acceso al perfil:", {
      requestedUuid: uuid,
      userUuid: req.user.uuid,
      userRole: req.user.role,
    });

    // Si el usuario es administrador, permitir acceso
    if (req.user.role === "ADMIN") {
      console.log("Acceso permitido: usuario es administrador");
      return next();
    }

    // Si el usuario está intentando acceder a su propio perfil, permitir acceso
    if (req.user.uuid && req.user.uuid === uuid) {
      console.log("Acceso permitido: usuario accediendo a su propio perfil");
      return next();
    }

    // En cualquier otro caso, denegar acceso
    console.log(
      "Acceso denegado: el usuario no tiene permisos para este perfil"
    );
    return res.status(403).json({
      error: "Acceso denegado. No tienes permiso para acceder a este perfil",
    });
  } catch (error) {
    console.error("Error en verificación de propiedad:", error);
    return res.status(500).json({ error: "Error en el servidor" });
  }
};

export { authenticateJWT, authenticateUser, isAdmin, isProfileOwnerOrAdmin };
