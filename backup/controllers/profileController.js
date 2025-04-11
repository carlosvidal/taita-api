const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const updateProfile = async (req, res) => {
  const { id, bio, picture, currentPassword, newPassword } = req.body;

  try {
    const user = await prisma.admin.findUnique({ where: { id: parseInt(id) } });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (newPassword) {
      const validPassword = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!validPassword) {
        return res.status(401).json({ error: "Contraseña actual incorrecta" });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.admin.update({
        where: { id: parseInt(id) },
        data: { password: hashedPassword },
      });
    }

    const updatedUser = await prisma.admin.update({
      where: { id: parseInt(id) },
      data: {
        bio: bio || user.bio,
        picture: picture || user.picture,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error al actualizar el perfil:", error);
    res.status(500).json({ error: "Error al actualizar el perfil" });
  }
};

module.exports = {
  updateProfile,
};
