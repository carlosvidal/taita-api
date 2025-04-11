import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const createMenuItem = async (req, res) => {
  const { label, url, order, parentId } = req.body;

  try {
    const menuItem = await prisma.menuItem.create({
      data: {
        label,
        url,
        order,
        parentId: parentId || null,
      },
    });
    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ error: "Error al crear el ítem de menú" });
  }
};

export {
  createMenuItem
};
