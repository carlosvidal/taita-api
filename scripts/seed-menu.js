import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function seedMenu() {
  try {
    // Buscar el blog demo
    const blog = await prisma.blog.findFirst({
      where: { subdomain: 'demo' }
    });

    if (!blog) {
      console.error('No se encontró el blog demo');
      return;
    }

    console.log(`Blog encontrado: ${blog.name} (ID: ${blog.id})`);

    // Eliminar menús existentes para este blog
    await prisma.menuItem.deleteMany({
      where: { blogId: blog.id }
    });

    // Crear menú de ejemplo
    const mainMenu = await prisma.menuItem.create({
      data: {
        uuid: uuidv4(),
        label: 'Inicio',
        url: '/',
        order: 1,
        blogId: blog.id
      }
    });

    const aboutMenu = await prisma.menuItem.create({
      data: {
        uuid: uuidv4(),
        label: 'Acerca de',
        url: '/acerca-de',
        order: 2,
        blogId: blog.id
      }
    });

    const blogMenu = await prisma.menuItem.create({
      data: {
        uuid: uuidv4(),
        label: 'Blog',
        url: '/blog',
        order: 3,
        blogId: blog.id
      }
    });

    // Submenú para Blog
    const techCategory = await prisma.menuItem.create({
      data: {
        uuid: uuidv4(),
        label: 'Tecnología',
        url: '/categoria/tecnologia',
        order: 1,
        parentId: blogMenu.id,
        blogId: blog.id
      }
    });

    const newsCategory = await prisma.menuItem.create({
      data: {
        uuid: uuidv4(),
        label: 'Noticias',
        url: '/categoria/noticias',
        order: 2,
        parentId: blogMenu.id,
        blogId: blog.id
      }
    });

    console.log('Menú de ejemplo creado exitosamente');
    console.log('Elementos del menú creados:');
    console.log('- Inicio');
    console.log('- Acerca de');
    console.log('- Blog');
    console.log('  - Tecnología');
    console.log('  - Noticias');

  } catch (error) {
    console.error('Error al crear el menú de ejemplo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMenu();
