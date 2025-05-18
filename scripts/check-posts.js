import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener el directorio actual del módulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno de producción
dotenv.config({ path: path.resolve(__dirname, '../../.env.production') });

console.log('Conectando a la base de datos de producción...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '*** Configurado ***' : 'No configurado');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkPosts() {
  try {
    // Obtener todos los posts
    const posts = await prisma.post.findMany({
      include: {
        blog: {
          select: {
            id: true,
            uuid: true,
            name: true
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`\n=== Total de posts: ${posts.length} ===`);
    
    // Mostrar información detallada de cada post
    posts.forEach(post => {
      console.log('\n---');
      console.log(`ID: ${post.id}`);
      console.log(`UUID: ${post.uuid}`);
      console.log(`Título: ${post.title}`);
      console.log(`Blog ID: ${post.blogId}`);
      console.log(`Blog UUID: ${post.blog?.uuid || 'No asignado'}`);
      console.log(`Nombre del blog: ${post.blog?.name || 'No asignado'}`);
    });
    
    // Obtener todos los blogs con conteo de posts
    const blogs = await prisma.blog.findMany({
      include: {
        _count: {
          select: { posts: true }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log('\n=== Posts por blog ===');
    for (const blog of blogs) {
      console.log(`\nBlog ID: ${blog.id}`);
      console.log(`Blog UUID: ${blog.uuid}`);
      console.log(`Nombre: ${blog.name}`);
      console.log(`Cantidad de posts: ${blog._count.posts}`);
    }
    
    // Contar posts sin blog (esto debería ser 0 ya que blogId es obligatorio en el esquema)
    try {
      const postsWithoutBlog = await prisma.post.count({
        where: {
          blogId: null
        }
      });
      console.log(`\n=== Posts sin blog asignado: ${postsWithoutBlog} ===`);
    } catch (error) {
      console.log('\n=== No se pudo contar posts sin blog (probablemente porque blogId es obligatorio) ===');
    }
    
  } catch (error) {
    console.error('Error al verificar posts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPosts();
