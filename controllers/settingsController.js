const { PrismaClient } = require("@prisma/client");
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
  const { language, template, domain, googleAnalyticsId, socialNetworks } =
    req.body;

  if (template && !["default", "minimal", "professional"].includes(template)) {
    return res.status(400).json({ error: "Plantilla no válida" });
  }

  try {
    const settings = await prisma.blogSettings.upsert({
      where: { id: 1 },
      update: { language, template, domain, googleAnalyticsId, socialNetworks },
      create: { language, template, domain, googleAnalyticsId, socialNetworks },
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar configuraciones" });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
