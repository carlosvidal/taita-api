import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixBlogDomain() {
  try {
    // Buscar el blog con subdomain 'demo'
    const blog = await prisma.blog.findFirst({
      where: { subdomain: 'demo' }
    });

    if (!blog) {
      console.log('No se encontró ningún blog con subdomain "demo"');
      return;
    }

    console.log('Blog encontrado:', blog);

    // Actualizar el dominio del blog
    const updatedBlog = await prisma.blog.update({
      where: { id: blog.id },
      data: {
        domain: 'taita.blog',
        subdomain: 'demo'
      }
    });

    console.log('Blog actualizado:', updatedBlog);
  } catch (error) {
    console.error('Error al actualizar el blog:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBlogDomain();
