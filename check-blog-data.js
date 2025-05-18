// Script para verificar los datos del blog
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBlogData() {
  try {
    // Verificar el Blog Migración (ID: 1)
    console.log('=== Verificando Blog Migración (ID: 1) ===');
    
    // Obtener el blog
    const blog = await prisma.blog.findUnique({
      where: { id: 1 },
      include: {
        posts: {
          select: { id: true, title: true, status: true },
        },
        categories: {
          select: { id: true, name: true },
        },
      },
    });

    console.log('Datos del blog:', JSON.stringify(blog, null, 2));
    
    // Contar posts manualmente
    const postCount = await prisma.post.count({
      where: { blogId: 1 },
    });
    
    console.log('\nTotal de posts encontrados:', postCount);
    
    // Contar categorías manualmente
    const categoryCount = await prisma.category.count({
      where: { blogId: 1 },
    });
    
    console.log('Total de categorías encontradas:', categoryCount);
    
    // Verificar también el Blog Principal (ID: 2) para comparar
    console.log('\n=== Verificando Blog Principal (ID: 2) ===');
    
    const mainBlog = await prisma.blog.findUnique({
      where: { id: 2 },
      include: {
        posts: {
          select: { id: true, title: true, status: true },
        },
        categories: {
          select: { id: true, name: true },
        },
      },
    });
    
    console.log('Datos del blog principal:', JSON.stringify(mainBlog, null, 2));
    
  } catch (error) {
    console.error('Error al verificar los datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBlogData();
