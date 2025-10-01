import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addUncategorizedCategory() {
  try {
    console.log('🔍 Buscando blogs en la base de datos...');

    // Obtener todos los blogs
    const blogs = await prisma.blog.findMany({
      select: {
        id: true,
        name: true,
        uuid: true
      }
    });

    console.log(`✅ Encontrados ${blogs.length} blogs`);

    for (const blog of blogs) {
      console.log(`\n📝 Procesando blog: ${blog.name} (ID: ${blog.id})`);

      // Verificar si ya existe una categoría "Sin categoría" para este blog
      const existingCategory = await prisma.category.findFirst({
        where: {
          blogId: blog.id,
          slug: 'sin-categoria'
        }
      });

      if (existingCategory) {
        console.log(`   ⏭️  Ya existe la categoría "Sin categoría" para este blog`);
        continue;
      }

      // Crear la categoría "Sin categoría"
      const category = await prisma.category.create({
        data: {
          name: 'Sin categoría',
          slug: 'sin-categoria',
          blogId: blog.id
        }
      });

      console.log(`   ✅ Categoría "Sin categoría" creada con ID: ${category.id}`);

      // Actualizar posts sin categoría para que usen esta categoría por defecto
      const postsWithoutCategory = await prisma.post.findMany({
        where: {
          blogId: blog.id,
          categoryId: null
        },
        select: {
          id: true,
          title: true
        }
      });

      if (postsWithoutCategory.length > 0) {
        console.log(`   📄 Encontrados ${postsWithoutCategory.length} posts sin categoría`);

        const updateResult = await prisma.post.updateMany({
          where: {
            blogId: blog.id,
            categoryId: null
          },
          data: {
            categoryId: category.id
          }
        });

        console.log(`   ✅ ${updateResult.count} posts actualizados con la categoría "Sin categoría"`);
      } else {
        console.log(`   ℹ️  No hay posts sin categoría en este blog`);
      }
    }

    console.log('\n✨ Proceso completado exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
addUncategorizedCategory()
  .then(() => {
    console.log('👋 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
