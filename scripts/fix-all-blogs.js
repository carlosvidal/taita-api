import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixAllBlogs() {
  try {
    // Obtener todos los blogs
    const blogs = await prisma.blog.findMany();
    console.log(`Encontrados ${blogs.length} blogs para actualizar`);

    // Actualizar cada blog
    for (const blog of blogs) {
      console.log(`\nProcesando blog: ${blog.name} (ID: ${blog.id}, UUID: ${blog.uuid})`);
      console.log('Datos actuales:', {
        subdomain: blog.subdomain,
        domain: blog.domain
      });

      // Actualizar el dominio del blog
      const updatedBlog = await prisma.blog.update({
        where: { id: blog.id },
        data: {
          domain: 'taita.blog'
        }
      });

      console.log('Blog actualizado:', {
        id: updatedBlog.id,
        name: updatedBlog.name,
        subdomain: updatedBlog.subdomain,
        domain: updatedBlog.domain
      });

      // Verificar los posts del blog
      const posts = await prisma.post.findMany({
        where: { 
          blogId: blog.id,
          status: 'PUBLISHED'
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });

      console.log(`El blog tiene ${posts.length} posts publicados:`);
      posts.forEach(post => {
        console.log(`- ${post.title} (ID: ${post.id}, Status: ${post.status})`);
      });

      // Si no hay posts publicados, verificar todos los posts
      if (posts.length === 0) {
        const allPosts = await prisma.post.findMany({
          where: { blogId: blog.id },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            updatedAt: true
          }
        });

        console.log(`El blog tiene ${allPosts.length} posts en total (incluyendo no publicados):`);
        allPosts.forEach(post => {
          console.log(`- ${post.title} (ID: ${post.id}, Status: ${post.status})`);
        });

        // Si hay posts pero ninguno está publicado, publicar el primero
        if (allPosts.length > 0) {
          const firstPost = allPosts[0];
          console.log(`Publicando el post "${firstPost.title}" (ID: ${firstPost.id})...`);
          
          await prisma.post.update({
            where: { id: firstPost.id },
            data: {
              status: 'PUBLISHED',
              publishedAt: new Date()
            }
          });
          
          console.log(`Post "${firstPost.title}" publicado exitosamente`);
        }
      }
    }

    console.log('\nTodos los blogs han sido actualizados correctamente');
  } catch (error) {
    console.error('Error al actualizar los blogs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllBlogs();
