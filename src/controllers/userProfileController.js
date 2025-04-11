import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

/**
 * Obtener perfil de usuario por UUID
 */
export const getUserProfileByUuid = async (req, res) => {
  try {
    const { uuid } = req.params;
    
    if (!uuid) {
      return res.status(400).json({ error: "UUID no proporcionado" });
    }
    
    console.log(`Buscando usuario con UUID: ${uuid}`);
    
    const user = await prisma.admin.findUnique({
      where: { uuid }
    });
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    // No enviar la contraseña en la respuesta
    const { password, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Error al obtener perfil de usuario:", error);
    res.status(500).json({ error: "Error al obtener perfil de usuario" });
  }
};

/**
 * Obtener todos los perfiles de usuario
 */
export const getAllUserProfiles = async (req, res) => {
  try {
    const users = await prisma.admin.findMany({
      select: {
        id: true,
        uuid: true,
        name: true,
        email: true,
        bio: true,
        picture: true,
        role: true
      }
    });
    
    res.json(users);
  } catch (error) {
    console.error("Error al obtener perfiles de usuario:", error);
    res.status(500).json({ error: "Error al obtener perfiles de usuario" });
  }
};

/**
 * Actualizar perfil de usuario
 */
export const updateUserProfile = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { name, email, bio, password, currentPassword, role } = req.body;
    
    // Verificar si el usuario existe
    const user = await prisma.admin.findUnique({
      where: { uuid }
    });
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    // Preparar los datos para actualizar
    const updateData = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (bio) updateData.bio = bio;
    
    // Solo los administradores pueden cambiar roles
    if (role && req.user && req.user.role === 'ADMIN') {
      updateData.role = role;
    }
    
    // Si se proporciona una nueva contraseña, verificar la contraseña actual
    if (password) {
      // Verificar la contraseña actual usando bcrypt
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Contraseña actual incorrecta" });
      }
      
      // Hashear la nueva contraseña
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    
    // Actualizar el perfil
    const updatedUser = await prisma.admin.update({
      where: { uuid },
      data: updateData
    });
    
    // No enviar la contraseña en la respuesta
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Error al actualizar perfil de usuario:", error);
    
    // Manejar error de email duplicado
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "El email ya está en uso" });
    }
    
    res.status(500).json({ error: "Error al actualizar perfil de usuario" });
  }
};

/**
 * Actualizar foto de perfil
 */
export const updateProfilePicture = async (req, res) => {
  try {
    const { uuid } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: "No se proporcionó ninguna imagen" });
    }
    
    // Verificar si el usuario existe
    const user = await prisma.admin.findUnique({
      where: { uuid }
    });
    
    if (!user) {
      // Eliminar el archivo subido si el usuario no existe
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    // Si el usuario ya tiene una imagen de perfil, eliminarla
    if (user.picture) {
      const oldPicturePath = path.join(process.cwd(), user.picture);
      if (fs.existsSync(oldPicturePath)) {
        fs.unlinkSync(oldPicturePath);
      }
    }
    
    // Guardar la ruta de la nueva imagen
    const picturePath = req.file.path.replace(process.cwd(), '');
    
    // Actualizar el perfil con la nueva imagen
    const updatedUser = await prisma.admin.update({
      where: { uuid },
      data: { picture: picturePath }
    });
    
    // No enviar la contraseña en la respuesta
    const { password, ...userWithoutPassword } = updatedUser;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Error al actualizar foto de perfil:", error);
    res.status(500).json({ error: "Error al actualizar foto de perfil" });
  }
};

/**
 * Crear un nuevo usuario
 */
export const createUser = async (req, res) => {
  try {
    const { name, email, password, bio, role } = req.body;
    
    // Validar datos requeridos
    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son requeridos" });
    }
    
    // Verificar si el email ya está en uso
    const existingUser = await prisma.admin.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: "El email ya está en uso" });
    }
    
    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Determinar el rol (solo los administradores pueden crear otros administradores)
    let userRole = 'AUTHOR';
    if (role === 'ADMIN' && req.user && req.user.role === 'ADMIN') {
      userRole = 'ADMIN';
    }
    
    // Crear el nuevo usuario
    const newUser = await prisma.admin.create({
      data: {
        name: name || email.split('@')[0],
        email,
        password: hashedPassword,
        bio: bio || '',
        role: userRole,
        uuid: undefined // Prisma generará automáticamente un UUID
      }
    });
    
    // No enviar la contraseña en la respuesta
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
};
