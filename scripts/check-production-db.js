import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import readline from 'readline';

// Configurar readline para entrada de usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función para preguntar por la URL de la base de datos
function askForDatabaseUrl() {
  return new Promise((resolve) => {
    rl.question('Por favor, ingresa la URL de conexión a la base de datos de producción: ', (url) => {
      resolve(url.trim());
    });
  });
}

async function main() {
  try {
    console.log('=== Verificación de Base de Datos de Producción ===\n');
    
    // Solicitar URL de la base de datos
    const dbUrl = await askForDatabaseUrl();
    
    if (!dbUrl) {
      console.error('Error: Debes proporcionar una URL de base de datos válida.');
      process.exit(1);
    }
    
    console.log('\nConectando a la base de datos de producción...');
    
    // Configurar Prisma con la URL proporcionada
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl
        }
      }
    });
    
    // Verificar conexión
    await prisma.$connect();
    console.log('✓ Conexión exitosa a la base de datos de producción\n');
    
    // Obtener todos los blogs
    console.log('=== Lista de Blogs ===');
    const blogs = await prisma.blog.findMany({
      select: {
        id: true,
        uuid: true,
        name: true,
        subdomain: true,
        domain: true,
        _count: {
          select: { posts: true, pages: true, categories: true }
        },
        admin: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });
    
    if (blogs.length === 0) {
      console.log('No se encontraron blogs en la base de datos.');
    } else {
      console.log(`\nTotal de blogs: ${blogs.length}\n`);
      
      for (const blog of blogs) {
        console.log(`--- Blog ID: ${blog.id} ---`);
        console.log(`UUID: ${blog.uuid}`);
        console.log(`Nombre: ${blog.name}`);
        console.log(`Subdominio: ${blog.subdomain || 'No definido'}`);
        console.log(`Dominio: ${blog.domain || 'No definido'}`);
        console.log(`Administrador: ${blog.admin?.name || 'Desconocido'} (${blog.admin?.email || 'sin email'})`);
        console.log(`Estadísticas:`);
        console.log(`  - Posts: ${blog._count.posts}`);
        console.log(`  - Páginas: ${blog._count.pages}`);
        console.log(`  - Categorías: ${blog._count.categories}\n`);
      }
    }
    
    // Obtener los posts del primer blog (si existe)
    if (blogs.length > 0) {
      const firstBlog = blogs[0];
      console.log(`\n=== Últimos 5 posts del blog "${firstBlog.name}" ===`);
      
      const posts = await prisma.post.findMany({
        where: { blogId: firstBlog.id },
        select: {
          id: true,
          uuid: true,
          title: true,
          status: true,
          publishedAt: true,
          author: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      
      if (posts.length === 0) {
        console.log('No se encontraron posts en este blog.');
      } else {
        for (const post of posts) {
          console.log(`\n--- ${post.title} ---`);
          console.log(`ID: ${post.id} (${post.uuid})`);
          console.log(`Estado: ${post.status}`);
          console.log(`Publicado: ${post.publishedAt || 'No publicado'}`);
          console.log(`Autor: ${post.author?.name || 'Desconocido'} (${post.author?.email || 'sin email'})`);
        }
      }
    }
    
  } catch (error) {
    console.error('\nError al conectar con la base de datos de producción:');
    console.error(error.message);
    
    if (error.code === 'P1012') {
      console.error('\nError de autenticación. Por favor, verifica la URL de conexión.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\nNo se pudo encontrar el servidor de base de datos. Verifica la URL y tu conexión a internet.');
    } else if (error.code === 'P1001') {
      console.error('\nNo se pudo establecer conexión con la base de datos. Verifica que el servidor esté en ejecución y accesible.');
    }
    
    process.exit(1);
  } finally {
    await prisma?.$disconnect();
    rl.close();
  }
}

main();
