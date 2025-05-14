// Script para corregir la base de datos en producción
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando corrección de la base de datos en producción...');

  try {
    // 1. Verificar y obtener el usuario admin
    let admin = await prisma.admin.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (!admin) {
      console.log('No se encontró un usuario SUPER_ADMIN. Creando uno nuevo...');
      
      // Crear un nuevo admin si no existe
      const hashedPassword = await import('bcryptjs').then(bcrypt => 
        bcrypt.hash('securepassword', 10)
      );
      
      admin = await prisma.admin.create({
        data: {
          uuid: uuidv4(),
          email: 'admin@example.com',
          password: hashedPassword,
          name: 'Admin User',
          role: 'SUPER_ADMIN'
        }
      });
      console.log(`Nuevo admin creado: ${admin.name} (${admin.email})`);
    } else {
      console.log(`Admin encontrado: ${admin.name} (${admin.email})`);
    }

    // 2. Verificar blogs existentes
    const existingBlogs = await prisma.blog.findMany();
    console.log(`Se encontraron ${existingBlogs.length} blogs en la base de datos`);

    // 3. Procesar cada blog existente
    for (const blog of existingBlogs) {
      console.log(`Procesando blog ID ${blog.id}: ${blog.name || 'Sin nombre'}`);
      
      // Verificar si el blog tiene UUID
      if (!blog.uuid) {
        await prisma.blog.update({
          where: { id: blog.id },
          data: { uuid: uuidv4() }
        });
        console.log(`- Asignado nuevo UUID al blog ID ${blog.id}`);
      }
      
      // Verificar si el blog está asociado a un admin
      if (!blog.adminId) {
        await prisma.blog.update({
          where: { id: blog.id },
          data: { adminId: admin.id }
        });
        console.log(`- Asociado blog ID ${blog.id} al admin ID ${admin.id}`);
      }
      
      // Verificar si el blog tiene subdominio
      if (!blog.subdomain) {
        const subdomain = blog.name 
          ? blog.name.toLowerCase().replace(/[^a-z0-9]/g, '') 
          : `blog${blog.id}`;
        
        await prisma.blog.update({
          where: { id: blog.id },
          data: { subdomain }
        });
        console.log(`- Asignado subdominio "${subdomain}" al blog ID ${blog.id}`);
      }
      
      // Verificar si el blog tiene plan
      if (!blog.plan) {
        await prisma.blog.update({
          where: { id: blog.id },
          data: { plan: 'FREE' }
        });
        console.log(`- Asignado plan "FREE" al blog ID ${blog.id}`);
      }
      
      // Verificar si el blog tiene categorías
      const categories = await prisma.category.findMany({
        where: { blogId: blog.id }
      });
      
      if (categories.length === 0) {
        await prisma.category.createMany({
          data: [
            { name: "Tecnología", slug: "tecnologia", blogId: blog.id },
            { name: "Vida", slug: "vida", blogId: blog.id },
            { name: "Noticias", slug: "noticias", blogId: blog.id }
          ]
        });
        console.log(`- Creadas categorías para el blog ID ${blog.id}`);
      } else {
        console.log(`- El blog ID ${blog.id} ya tiene ${categories.length} categorías`);
      }
    }

    // 4. Si no hay blogs, crear uno nuevo
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
    }

    // 5. Mostrar todos los blogs disponibles
    const allBlogs = await prisma.blog.findMany({
      select: {
        id: true,
        uuid: true,
        name: true,
        subdomain: true,
        adminId: true,
        _count: {
          select: { categories: true }
        }
      }
    });
    
    console.log('\nBlogs disponibles después de las correcciones:');
    console.table(allBlogs.map(blog => ({
      id: blog.id,
      uuid: blog.uuid,
      name: blog.name,
      subdomain: blog.subdomain,
      adminId: blog.adminId,
      categories: blog._count.categories
    })));
    
    console.log('\nProceso completado con éxito');
  } catch (error) {
    console.error('Error durante el proceso:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
