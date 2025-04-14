import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const getSettings = async (req, res) => {
  try {
    const settings = await prisma.blogSettings.findFirst();
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: "Error al obtener configuraciones" });
  }
};

const updateSettings = async (req, res) => {
  const { title, description, language, template, domain, googleAnalyticsId, socialNetworks } =
    req.body;

  if (template && !["default", "minimal", "professional"].includes(template)) {
    return res.status(400).json({ error: "Plantilla no válida" });
  }

  try {
    // Buscar primero las configuraciones existentes
    const existingSettings = await prisma.blogSettings.findFirst();
    
    let settings;
    
    if (existingSettings) {
      // Actualizar configuraciones existentes
      settings = await prisma.blogSettings.update({
        where: { id: existingSettings.id },
        data: { title, description, language, template, domain, googleAnalyticsId, socialNetworks },
      });
    } else {
      // Crear nuevas configuraciones si no existen
      settings = await prisma.blogSettings.create({
        data: { title, description, language, template, domain, googleAnalyticsId, socialNetworks },
      });
    }
    
    console.log('Configuraciones actualizadas:', settings);
    res.json(settings);
  } catch (error) {
    console.error('Error al actualizar configuraciones:', error);
    res.status(500).json({ error: "Error al actualizar configuraciones" });
  }
};

export {
  getSettings,
  updateSettings
};
