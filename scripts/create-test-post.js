import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function createTestPost() {
  try {
    // Obtener el blog
    const blog = await prisma.blog.findFirst({
      where: { subdomain: 'demo' }
    });

    if (!blog) {
      console.log('No se encontró el blog con subdomain "demo"');
      return;
    }

    console.log('Blog encontrado:', {
      id: blog.id,
      name: blog.name,
      subdomain: blog.subdomain,
      domain: blog.domain
    });

    // Obtener el primer usuario admin
    const admin = await prisma.admin.findFirst();

    if (!admin) {
      console.log('No se encontró ningún usuario admin');
      return;
    }

    console.log('Admin encontrado:', {
      id: admin.id,
      name: admin.name,
      email: admin.email
    });

    // Obtener o crear una categoría
    let category = await prisma.category.findFirst({
      where: { blogId: blog.id }
    });

    if (!category) {
      console.log('No se encontró ninguna categoría, creando una nueva...');
      category = await prisma.category.create({
        data: {
          name: 'General',
          slug: 'general',
          blogId: blog.id
        }
      });
    }

    console.log('Categoría:', {
      id: category.id,
      name: category.name,
      slug: category.slug
    });

    // Crear un post de prueba
    const post = await prisma.post.create({
      data: {
        uuid: uuidv4(),
        title: 'Post de prueba',
        content: '<p>Este es un post de prueba creado automáticamente.</p><p>Si puedes ver este post, significa que el sistema está funcionando correctamente.</p>',
        excerpt: 'Este es un post de prueba creado automáticamente.',
        slug: 'post-de-prueba',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        blogId: blog.id,
        authorId: admin.id,
        categoryId: category.id
      }
    });

    console.log('Post creado exitosamente:', {
      id: post.id,
      uuid: post.uuid,
      title: post.title,
      status: post.status,
      blogId: post.blogId,
      authorId: post.authorId,
      categoryId: post.categoryId
    });

    // Crear un segundo post de prueba
    const post2 = await prisma.post.create({
      data: {
        uuid: uuidv4(),
        title: 'Segundo post de prueba',
        content: '<p>Este es otro post de prueba creado automáticamente.</p><p>Si puedes ver este post, significa que el sistema está funcionando correctamente.</p>',
        excerpt: 'Este es otro post de prueba creado automáticamente.',
        slug: 'segundo-post-de-prueba',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        blogId: blog.id,
        authorId: admin.id,
        categoryId: category.id
      }
    });

    console.log('Segundo post creado exitosamente:', {
      id: post2.id,
      uuid: post2.uuid,
      title: post2.title,
      status: post2.status,
      blogId: post2.blogId,
      authorId: post2.authorId,
      categoryId: post2.categoryId
    });

  } catch (error) {
    console.error('Error al crear el post de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPost();
