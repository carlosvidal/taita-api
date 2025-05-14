// Script para verificar y corregir los blogs en la base de datos
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando verificación y corrección de blogs...');

  try {
    // 1. Obtener el usuario admin
    const admin = await prisma.admin.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (!admin) {
      console.error('No se encontró un usuario SUPER_ADMIN');
      return;
    }

    console.log(`Admin encontrado: ${admin.name} (${admin.email})`);

    // 2. Verificar si hay blogs existentes
    const existingBlogs = await prisma.blog.findMany();
    console.log(`Se encontraron ${existingBlogs.length} blogs en la base de datos`);

    // 3. Si no hay blogs, crear uno nuevo
    if (existingBlogs.length === 0) {
      console.log('No se encontraron blogs. Creando un blog de ejemplo...');
      
      const newBlog = await prisma.blog.create({
        data: {
          uuid: uuidv4(),
          name: "Blog Principal",
          subdomain: "demo",
          plan: "FREE",
          adminId: admin.id,
          title: "Blog Principal",
          description: "Un blog de ejemplo para pruebas.",
          language: "es",
          template: "default",
          googleAnalyticsId: "",
          socialNetworks: { twitter: "", facebook: "", instagram: "" }
        }
      });
      
      console.log(`Nuevo blog creado con ID: ${newBlog.id} y UUID: ${newBlog.uuid}`);
      
      // Crear categorías para el nuevo blog
      await prisma.category.createMany({
        data: [
          { name: "Tecnología", slug: "tecnologia", blogId: newBlog.id },
          { name: "Vida", slug: "vida", blogId: newBlog.id },
          { name: "Noticias", slug: "noticias", blogId: newBlog.id }
        ]
      });
      
      console.log('Categorías creadas para el nuevo blog');
    } else {
      // 4. Verificar que todos los blogs tengan UUID
      for (const blog of existingBlogs) {
        if (!blog.uuid) {
          const updatedBlog = await prisma.blog.update({
            where: { id: blog.id },
            data: { uuid: uuidv4() }
          });
          console.log(`Blog ID ${blog.id} actualizado con UUID: ${updatedBlog.uuid}`);
        } else {
          console.log(`Blog ID ${blog.id} ya tiene UUID: ${blog.uuid}`);
        }
      }
    }

    // 5. Mostrar todos los blogs disponibles
    const allBlogs = await prisma.blog.findMany({
      select: {
        id: true,
        uuid: true,
        name: true,
        subdomain: true,
        adminId: true
      }
    });
    
    console.log('Blogs disponibles:');
    console.table(allBlogs);
    
    console.log('Proceso completado con éxito');
  } catch (error) {
    console.error('Error durante el proceso:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
