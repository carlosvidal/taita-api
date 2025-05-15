// Middleware para verificar si el usuario es administrador o super administrador
export const isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN")) {
    return next();
  }
  return res
    .status(403)
    .json({
      error: "Acceso denegado: se requieren privilegios de administrador",
    });
};
