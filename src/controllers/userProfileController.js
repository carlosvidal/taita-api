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
    console.log('===== INICIO PROCESO DE ACTUALIZACIÓN DE FOTO DE PERFIL =====');
    console.log('Parámetros de la solicitud:', req.params);
    console.log('Cabeceras de la solicitud:', req.headers);
    console.log('Tipo de contenido:', req.headers['content-type']);
    
    // Verificar si se recibió un archivo
    if (!req.file) {
      console.error('Error: No se detectó ningún archivo en la solicitud');
      console.log('Contenido de req.body:', req.body);
      console.log('Contenido de req.files:', req.files);
      return res.status(400).json({ 
        error: "No se proporcionó ninguna imagen", 
        detalle: "El servidor no pudo procesar el archivo enviado" 
      });
    }
    
    // Usar req.file ya que estamos usando upload.single
    const { buffer, originalname, mimetype } = req.file;
    console.log('Archivo recibido correctamente:', { 
      originalname, 
      mimetype, 
      size: buffer?.length || 0 
    });
    
    const { uuid } = req.params;
    
    // Verificar si el usuario existe
    const user = await prisma.admin.findUnique({
      where: { uuid }
    });
    
    if (!user) {
      console.error(`Usuario con UUID ${uuid} no encontrado`);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    console.log(`Usuario encontrado: ${user.name} (${user.email})`);
    
    // Si el usuario ya tiene una imagen de perfil, eliminarla
    if (user.picture) {
      console.log(`El usuario tiene una imagen de perfil existente: ${user.picture}`);
      
      // Comprobar si la ruta es absoluta o relativa
      let oldPicturePath = user.picture;
      if (!path.isAbsolute(oldPicturePath)) {
        // Si es una ruta relativa, convertirla a absoluta
        if (oldPicturePath.startsWith('/')) {
          // Si comienza con /, es relativa a la raíz del proyecto
          oldPicturePath = path.join(process.cwd(), '..', oldPicturePath.substring(1));
        } else {
          // De lo contrario, es relativa al directorio actual
          oldPicturePath = path.join(process.cwd(), oldPicturePath);
        }
      }
      
      console.log('Ruta absoluta de la imagen anterior:', oldPicturePath);
      
      try {
        if (fs.existsSync(oldPicturePath)) {
          fs.unlinkSync(oldPicturePath);
          console.log('Imagen anterior eliminada con éxito');
        } else {
          console.log('No se encontró la imagen anterior para eliminar');
        }
      } catch (err) {
        console.error('Error al intentar eliminar la imagen anterior:', err);
        // Continuamos con el proceso a pesar del error
      }
    }
    
    // Crear directorio de uploads si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Generar nombre de archivo único
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'profile-' + uniqueSuffix + path.extname(originalname);
    const filePath = path.join(uploadDir, filename);
    
    // Guardar el archivo en disco
    fs.writeFileSync(filePath, buffer);
    console.log('Archivo guardado en:', filePath);
    
    // Convertir la ruta absoluta a una ruta relativa desde la raíz del proyecto
    const projectRoot = path.join(process.cwd(), '..');
    const picturePath = '/' + path.relative(projectRoot, filePath).replace(/\\/g, '/');
    
    console.log('Ruta relativa de la nueva imagen:', picturePath);
    
    // Actualizar el perfil con la nueva imagen
    const updatedUser = await prisma.admin.update({
      where: { uuid },
      data: { picture: picturePath }
    });
    
    console.log('Perfil actualizado correctamente con la nueva imagen');
    
    // No enviar la contraseña en la respuesta
    const { password, ...userWithoutPassword } = updatedUser;
    
    console.log('===== FIN PROCESO DE ACTUALIZACIÓN DE FOTO DE PERFIL =====');
    
    return res.status(200).json({
      mensaje: "Imagen de perfil actualizada con éxito",
      usuario: userWithoutPassword
    });
  } catch (error) {
    console.error("Error al actualizar foto de perfil:", error);
    return res.status(500).json({ 
      error: "Error al actualizar foto de perfil",
      mensaje: error.message
    });
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
