import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const getSettings = async (req, res) => {
  try {
    // Busca el primer blog (puedes personalizar el criterio si hay multi-tenant)
    const blog = await prisma.blog.findFirst();
    if (!blog) return res.status(404).json({ error: "No se encontró el blog" });
    // Devuelve solo los campos de configuración
    const { title, description, language, template, domain, googleAnalyticsId, socialNetworks } = blog;
    res.json({ title, description, language, template, domain, googleAnalyticsId, socialNetworks });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener configuraciones" });
  }
};

const updateSettings = async (req, res) => {
  const { title, description, language, template, domain, googleAnalyticsId, socialNetworks } = req.body;

  if (template && !["default", "minimal", "professional"].includes(template)) {
    return res.status(400).json({ error: "Plantilla no válida" });
  }

  try {
    // Busca el primer blog (puedes personalizar el criterio si hay multi-tenant)
    const blog = await prisma.blog.findFirst();
    if (!blog) return res.status(404).json({ error: "No se encontró el blog" });
    // Actualiza los campos de configuración
    const updated = await prisma.blog.update({
      where: { id: blog.id },
      data: { title, description, language, template, domain, googleAnalyticsId, socialNetworks },
    });
    console.log('Configuraciones actualizadas:', updated);
    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar configuraciones:', error);
    res.status(500).json({ error: "Error al actualizar configuraciones" });
  }
};

export {
  getSettings,
  updateSettings
};
