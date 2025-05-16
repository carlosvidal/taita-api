import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCategoryConstraints() {
  try {
    console.log('Iniciando corrección de restricciones de categorías...');
    
    // 1. Eliminar restricciones únicas existentes si existen
    console.log('Eliminando restricciones únicas existentes...');
    try {
      await prisma.$executeRaw`ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_name_key";`;
      console.log('- Restricción única en "name" eliminada');
      
      await prisma.$executeRaw`ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_slug_key";`;
      console.log('- Restricción única en "slug" eliminada');
      
      await prisma.$executeRaw`ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "category_name_blog_id_unique";`;
      console.log('- Restricción compuesta antigua en (name, blogId) eliminada');
      
      await prisma.$executeRaw`ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "category_slug_blog_id_unique";`;
      console.log('- Restricción compuesta antigua en (slug, blogId) eliminada');
    } catch (error) {
      console.error('Error al eliminar restricciones existentes:', error.message);
    }
    
    // 2. Agregar nuevas restricciones compuestas
    console.log('\nAgregando nuevas restricciones compuestas...');
    try {
      await prisma.$executeRaw`ALTER TABLE "Category" ADD CONSTRAINT "category_name_blog_id_unique" UNIQUE ("name", "blogId");`;
      console.log('- Restricción única compuesta en (name, blogId) agregada');
      
      await prisma.$executeRaw`ALTER TABLE "Category" ADD CONSTRAINT "category_slug_blog_id_unique" UNIQUE ("slug", "blogId");`;
      console.log('- Restricción única compuesta en (slug, blogId) agregada');
      
      console.log('\n✅ Restricciones actualizadas exitosamente');
    } catch (error) {
      console.error('Error al agregar nuevas restricciones:', error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('Error en fixCategoryConstraints:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la función
fixCategoryConstraints()
  .then(() => {
    console.log('Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en el proceso:', error);
    process.exit(1);
  });
