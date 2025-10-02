import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const getSettings = async (req, res) => {
  // Verificar que el usuario tenga rol de ADMIN o SUPER_ADMIN
  if (!req.user || (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN")) {
    return res
      .status(403)
      .json({ error: "No autorizado. Se requiere rol de administrador o super administrador" });
  }

  try {
    // Busca el primer blog (puedes personalizar el criterio si hay multi-tenant)
    const blog = await prisma.blog.findFirst();
    if (!blog) return res.status(404).json({ error: "No se encontró el blog" });
    // Devuelve solo los campos de configuración
    const {
      title,
      description,
      language,
      template,
      domain,
      googleAnalyticsId,
      socialNetworks,
      timezone,
    } = blog;
    res.json({
      title,
      description,
      language,
      template,
      domain,
      googleAnalyticsId,
      socialNetworks,
      timezone: timezone || 'America/Lima',
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener configuraciones" });
  }
};

const updateSettings = async (req, res) => {
  // Verificar que el usuario tenga rol de ADMIN o SUPER_ADMIN
  if (!req.user || (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN")) {
    return res
      .status(403)
      .json({ error: "No autorizado. Se requiere rol de administrador o super administrador" });
  }

  const {
    title,
    description,
    language,
    template,
    domain,
    googleAnalyticsId,
    socialNetworks,
    timezone,
  } = req.body;

  if (template && !["default", "minimal", "professional"].includes(template)) {
    return res.status(400).json({ error: "Plantilla no válida" });
  }

  try {
    // Busca el primer blog (puedes personalizar el criterio si hay multi-tenant)
    const blog = await prisma.blog.findFirst();
    if (!blog) return res.status(404).json({ error: "No se encontró el blog" });

    // Verificar que el usuario sea el administrador del blog
    if (blog.adminId !== req.user.id) {
      return res
        .status(403)
        .json({
          error: "No autorizado. No eres el administrador de este blog",
        });
    }

    // Actualiza los campos de configuración
    const updateData = {
      title,
      description,
      language,
      template,
      domain,
      googleAnalyticsId,
      socialNetworks,
    };

    // Solo agregar timezone si se proporciona
    if (timezone !== undefined) {
      updateData.timezone = timezone;
    }

    const updated = await prisma.blog.update({
      where: { id: blog.id },
      data: updateData,
    });
    console.log("Configuraciones actualizadas:", updated);
    res.json(updated);
  } catch (error) {
    console.error("Error al actualizar configuraciones:", error);
    res.status(500).json({ error: "Error al actualizar configuraciones" });
  }
};

export { getSettings, updateSettings };
