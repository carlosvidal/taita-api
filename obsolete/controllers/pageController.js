const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
// Verifica que el método getPage esté usando el ID correcto
exports.getPage = async (req, res) => {
  try {
    const page = await prisma.page.findUnique({
      where: { uuid: req.params.uuid }
    });
    if (!page) {
      return res.status(404).json({ message: "Página no encontrada" });
    }
    res.json(page);
  } catch (error) {
    console.error("Error al obtener página:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};
