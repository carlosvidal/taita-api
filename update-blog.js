// Script para actualizar el blog existente y asociarlo con el administrador
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando actualización del blog...');

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

    // 2. Actualizar el blog existente
    const updatedBlog = await prisma.blog.update({
      where: { id: 1 },
      data: {
        adminId: admin.id,
        subdomain: 'demo',
        plan: 'FREE',
        language: 'es',
        template: 'default',
        googleAnalyticsId: '',
        socialNetworks: { twitter: '', facebook: '', instagram: '' }
      }
    });
    
    console.log(`Blog actualizado: ${JSON.stringify(updatedBlog, null, 2)}`);
    
    // 3. Verificar si el blog tiene categorías
    const categories = await prisma.category.findMany({
      where: { blogId: updatedBlog.id }
    });
    
    if (categories.length === 0) {
      console.log('No se encontraron categorías. Creando categorías para el blog...');
      
      await prisma.category.createMany({
        data: [
          { name: "Tecnología", slug: "tecnologia", blogId: updatedBlog.id },
          { name: "Vida", slug: "vida", blogId: updatedBlog.id },
          { name: "Noticias", slug: "noticias", blogId: updatedBlog.id }
        ]
      });
      
      console.log('Categorías creadas para el blog');
    } else {
      console.log(`Se encontraron ${categories.length} categorías para el blog`);
    }
    
    // 4. Mostrar el blog actualizado
    const finalBlog = await prisma.blog.findUnique({
      where: { id: updatedBlog.id },
      include: {
        categories: true
      }
    });
    
    console.log('Blog actualizado con éxito:');
    console.log(`ID: ${finalBlog.id}`);
    console.log(`UUID: ${finalBlog.uuid}`);
    console.log(`Nombre: ${finalBlog.name}`);
    console.log(`Subdominio: ${finalBlog.subdomain}`);
    console.log(`AdminID: ${finalBlog.adminId}`);
    console.log(`Categorías: ${finalBlog.categories.map(c => c.name).join(', ')}`);
    
    console.log('Proceso completado con éxito');
  } catch (error) {
    console.error('Error durante el proceso:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
