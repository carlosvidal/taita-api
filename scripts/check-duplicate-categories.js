import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicateCategories() {
  console.log('🔍 Verificando categorías duplicadas...\n');

  try {
    // Obtener todas las categorías
    const categories = await prisma.category.findMany({
      include: {
        blog: {
          select: {
            id: true,
            name: true,
            subdomain: true
          }
        },
        _count: {
          select: {
            posts: true
          }
        }
      },
      orderBy: [
        { blogId: 'asc' },
        { slug: 'asc' }
      ]
    });

    console.log(`Total de categorías en la base de datos: ${categories.length}\n`);

    // Agrupar por blog
    const byBlog = {};
    categories.forEach(cat => {
      const blogKey = `${cat.blogId}-${cat.blog?.name || 'Unknown'}`;
      if (!byBlog[blogKey]) {
        byBlog[blogKey] = [];
      }
      byBlog[blogKey].push(cat);
    });

    // Mostrar categorías por blog
    console.log('📊 Categorías por blog:\n');
    Object.keys(byBlog).forEach(blogKey => {
      const cats = byBlog[blogKey];
      console.log(`\n🔵 ${blogKey} (${cats.length} categorías)`);
      console.log('─'.repeat(60));
      cats.forEach(cat => {
        console.log(`  ID: ${cat.id} | Slug: ${cat.slug.padEnd(20)} | Name: ${cat.name.padEnd(20)} | Posts: ${cat._count.posts}`);
      });
    });

    // Buscar duplicados por slug dentro del mismo blog
    console.log('\n\n🔍 Buscando duplicados por slug...\n');
    let hasDuplicates = false;
    Object.keys(byBlog).forEach(blogKey => {
      const cats = byBlog[blogKey];
      const slugCounts = {};

      cats.forEach(cat => {
        slugCounts[cat.slug] = (slugCounts[cat.slug] || 0) + 1;
      });

      const duplicatedSlugs = Object.keys(slugCounts).filter(slug => slugCounts[slug] > 1);

      if (duplicatedSlugs.length > 0) {
        hasDuplicates = true;
        console.log(`❌ ${blogKey} tiene categorías duplicadas:`);
        duplicatedSlugs.forEach(slug => {
          const dupes = cats.filter(c => c.slug === slug);
          console.log(`   Slug "${slug}" aparece ${slugCounts[slug]} veces:`);
          dupes.forEach(d => {
            console.log(`     - ID: ${d.id} | Name: ${d.name} | Posts: ${d._count.posts}`);
          });
        });
        console.log('');
      }
    });

    if (!hasDuplicates) {
      console.log('✅ No se encontraron categorías duplicadas por slug dentro del mismo blog.');
    }

    // Buscar duplicados por nombre dentro del mismo blog
    console.log('\n\n🔍 Buscando duplicados por nombre...\n');
    hasDuplicates = false;
    Object.keys(byBlog).forEach(blogKey => {
      const cats = byBlog[blogKey];
      const nameCounts = {};

      cats.forEach(cat => {
        nameCounts[cat.name] = (nameCounts[cat.name] || 0) + 1;
      });

      const duplicatedNames = Object.keys(nameCounts).filter(name => nameCounts[name] > 1);

      if (duplicatedNames.length > 0) {
        hasDuplicates = true;
        console.log(`❌ ${blogKey} tiene categorías con nombres duplicados:`);
        duplicatedNames.forEach(name => {
          const dupes = cats.filter(c => c.name === name);
          console.log(`   Nombre "${name}" aparece ${nameCounts[name]} veces:`);
          dupes.forEach(d => {
            console.log(`     - ID: ${d.id} | Slug: ${d.slug} | Posts: ${d._count.posts}`);
          });
        });
        console.log('');
      }
    });

    if (!hasDuplicates) {
      console.log('✅ No se encontraron categorías duplicadas por nombre dentro del mismo blog.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateCategories();
