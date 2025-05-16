import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateExistingCategories() {
  try {
    console.log('Iniciando actualización de categorías existentes...');
    
    // Obtener todos los blogs
    const blogs = await prisma.blog.findMany({
      include: {
        categories: true
      }
    });
    
    console.log(`Se encontraron ${blogs.length} blogs`);
    
    for (const blog of blogs) {
      console.log(`\nProcesando blog: ${blog.name} (ID: ${blog.id})`);
      
      // Contador para categorías duplicadas
      let duplicateCount = 0;
      
      // Obtener todas las categorías del blog
      const categories = await prisma.category.findMany({
        where: { blogId: blog.id }
      });
      
      console.log(`- El blog tiene ${categories.length} categorías`);
      
      // Crear un mapa para rastrear nombres y slugs únicos
      const uniqueNames = new Map();
      const uniqueSlugs = new Map();
      
      // Procesar cada categoría
      for (const category of categories) {
        // Verificar si el nombre ya existe en este blog
        if (uniqueNames.has(category.name.toLowerCase())) {
          console.log(`  - Categoría duplicada (nombre): ${category.name}`);
          duplicateCount++;
          
          // Actualizar el nombre para hacerlo único
          const newName = `${category.name} (${duplicateCount})`;
          console.log(`  - Renombrando a: ${newName}`);
          
          await prisma.category.update({
            where: { id: category.id },
            data: { name: newName }
          });
        } else {
          uniqueNames.set(category.name.toLowerCase(), true);
        }
        
        // Verificar si el slug ya existe en este blog
        if (uniqueSlugs.has(category.slug.toLowerCase())) {
          console.log(`  - Slug duplicado: ${category.slug}`);
          
          // Actualizar el slug para hacerlo único
          const newSlug = `${category.slug}-${duplicateCount}`;
          console.log(`  - Actualizando slug a: ${newSlug}`);
          
          await prisma.category.update({
            where: { id: category.id },
            data: { slug: newSlug }
          });
        } else {
          uniqueSlugs.set(category.slug.toLowerCase(), true);
        }
      }
      
      if (duplicateCount > 0) {
        console.log(`- Se actualizaron ${duplicateCount} categorías duplicadas`);
      } else {
        console.log('- No se encontraron categorías duplicadas');
      }
    }
    
    console.log('\n✅ Proceso de actualización de categorías completado');
    
  } catch (error) {
    console.error('Error en updateExistingCategories:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la función
updateExistingCategories()
  .then(() => {
    console.log('Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en el proceso:', error);
    process.exit(1);
  });
