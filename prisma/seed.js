import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  // 1. Busca o crea el admin
  let admin = await prisma.admin.findUnique({ where: { email: "admin@example.com" } });
  if (admin) {
    // Si el usuario ya existe, actualizar su rol a SUPER_ADMIN
    admin = await prisma.admin.update({
      where: { id: admin.id },
      data: { role: "SUPER_ADMIN" }
    });
    console.log("Admin existente actualizado a SUPER_ADMIN");
  } else {
    // Hashear la contraseña antes de guardarla
    const hashedPassword = await bcrypt.hash("securepassword", 10);
    admin = await prisma.admin.create({
      data: {
        email: "admin@example.com",
        password: hashedPassword,
        name: "Admin User",
        role: "SUPER_ADMIN"
      }
    });
  }
  console.log({ admin });

  // 2. Busca o crea un blog principal asociado al admin
  // Primero verificamos si ya existe un blog para este admin
  let existingBlog = await prisma.blog.findFirst({
    where: { adminId: admin.id }
  });

  // También buscamos por subdomain para evitar conflictos
  let existingBlogBySubdomain = await prisma.blog.findFirst({
    where: { subdomain: "demo" }
  });

  let blog;
  if (existingBlog) {
    // Si ya existe, solo lo actualizamos
    blog = await prisma.blog.update({
      where: { id: existingBlog.id },
      data: {
        // Solo actualizamos campos que queremos mantener sincronizados
        name: "Blog Principal",
        title: "Blog Principal",
        description: "Un blog de ejemplo para pruebas.",
      }
    });
    console.log("Blog existente actualizado");
  } else if (existingBlogBySubdomain) {
    // Si existe un blog con el mismo subdominio, lo actualizamos y lo asociamos al admin
    blog = await prisma.blog.update({
      where: { id: existingBlogBySubdomain.id },
      data: {
        name: "Blog Principal",
        title: "Blog Principal",
        description: "Un blog de ejemplo para pruebas.",
        adminId: admin.id
      }
    });
    console.log("Blog existente por subdominio actualizado y asociado al admin");
  } else {
    // Si no existe, lo creamos
    blog = await prisma.blog.create({
      data: {
        name: "Blog Principal",
        subdomain: "demo",
        plan: "FREE",
        adminId: admin.id,
        title: "Blog Principal",
        description: "Un blog de ejemplo para pruebas.",
        language: "es",
        template: "default",
        googleAnalyticsId: "",
        socialNetworks: { twitter: "", facebook: "", instagram: "" }
      }
    });
    console.log("Nuevo blog creado");
  }
  console.log({ blog });

  // 3. Crea o reutiliza categorías asociadas al blog
  const categoryData = [
    { name: "Tecnología", slug: "tecnologia" },
    { name: "Vida", slug: "vida" },
    { name: "Noticias", slug: "noticias" }
  ];

  const categories = [];
  
  for (const cat of categoryData) {
    try {
      // Verificar si la categoría ya existe para este blog
      const existingCategory = await prisma.category.findFirst({
        where: {
          slug: cat.slug,
          blogId: blog.id
        }
      });
      
      let category;
      if (existingCategory) {
        // Actualizar la categoría existente
        category = await prisma.category.update({
          where: { id: existingCategory.id },
          data: { name: cat.name }
        });
      } else {
        // Crear una nueva categoría
        category = await prisma.category.create({
          data: {
            name: cat.name,
            slug: cat.slug,
            blogId: blog.id
          }
        });
      }
      categories.push(category);
    } catch (error) {
      console.error(`Error al procesar la categoría ${cat.name}:`, error);
    }
  }
  
  console.log({ categories });

  // 4. Crea posts asociados al blog y categorías
  const posts = await Promise.all([
    prisma.post.upsert({
      where: { slug: "primer-post" },
      update: {},
      create: {
        title: "Primer post de ejemplo",
        slug: "primer-post",
        content: "Este es el contenido del primer post de ejemplo.",
        authorId: admin.id,
        categoryId: categories[0].id,
        blogId: blog.id,
        publishedAt: new Date()
      }
    }),
    prisma.post.upsert({
      where: { slug: "segundo-post" },
      update: {},
      create: {
        title: "Segundo post",
        slug: "segundo-post",
        content: "Contenido del segundo post.",
        authorId: admin.id,
        categoryId: categories[1].id,
        blogId: blog.id,
        publishedAt: new Date()
      }
    }),
    prisma.post.upsert({
      where: { slug: "tercer-post" },
      update: {},
      create: {
        title: "Tercer post",
        slug: "tercer-post",
        content: "Contenido del tercer post.",
        authorId: admin.id,
        categoryId: categories[2].id,
        blogId: blog.id,
        publishedAt: new Date()
      }
    }),
    prisma.post.upsert({
      where: { slug: "cuarto-post" },
      update: {},
      create: {
        title: "Cuarto post",
        slug: "cuarto-post",
        content: "Contenido del cuarto post.",
        authorId: admin.id,
        categoryId: categories[0].id,
        blogId: blog.id,
        publishedAt: new Date()
      }
    }),
    prisma.post.upsert({
      where: { slug: "quinto-post" },
      update: {},
      create: {
        title: "Quinto post",
        slug: "quinto-post",
        content: "Contenido del quinto post.",
        authorId: admin.id,
        categoryId: categories[1].id,
        blogId: blog.id,
        publishedAt: new Date()
      }
    })
  ]);
  console.log({ posts });

  // 5. Crear tags de ejemplo y asociar a posts
  const tagData = [
    { name: "Ejemplo", slug: "ejemplo" },
    { name: "Tendencias", slug: "tendencias" },
    { name: "Noticias", slug: "noticias" },
    { name: "Vida", slug: "vida" },
    { name: "Tech", slug: "tech" }
  ];

  // Crear tags (upsert)
  const tags = [];
  for (const t of tagData) {
    let tag = await prisma.tag.upsert({
      where: { tag_slug_blog_id_unique: { slug: t.slug, blogId: blog.id } },
      update: { name: t.name },
      create: {
        name: t.name,
        slug: t.slug,
        blogId: blog.id
      }
    });
    tags.push(tag);
  }
  console.log({ tags });

  // Asociar tags a posts (al menos uno por post)
  const postTagPairs = [
    // Primer post: Ejemplo, Tech
    { postId: posts[0].id, tagSlugs: ["ejemplo", "tech"] },
    // Segundo post: Tendencias, Vida
    { postId: posts[1].id, tagSlugs: ["tendencias", "vida"] },
    // Tercer post: Noticias
    { postId: posts[2].id, tagSlugs: ["noticias"] },
    // Cuarto post: Vida, Ejemplo
    { postId: posts[3].id, tagSlugs: ["vida", "ejemplo"] },
    // Quinto post: Tech
    { postId: posts[4].id, tagSlugs: ["tech"] },
  ];

  for (const pair of postTagPairs) {
    for (const slug of pair.tagSlugs) {
      const tag = tags.find(t => t.slug === slug);
      if (tag) {
        await prisma.postTag.upsert({
          where: { postId_tagId: { postId: pair.postId, tagId: tag.id } },
          update: {},
          create: { postId: pair.postId, tagId: tag.id }
        });
      }
    }
  }
  console.log("Tags asociados a posts");

  // Crear páginas
  const pages = await Promise.all([
    prisma.page.upsert({
      where: { slug: "sobre-nosotros" },
      update: {},
      create: {
        title: "Sobre Nosotros",
        slug: "sobre-nosotros",
        content: "Esta es la página sobre nosotros.",
        authorId: admin.id,
        blogId: blog.id,
        publishedAt: new Date()
      }
    }),
    prisma.page.upsert({
      where: { slug: "contacto" },
      update: {},
      create: {
        title: "Contacto",
        slug: "contacto",
        content: "Página de contacto.",
        authorId: admin.id,
        blogId: blog.id,
        publishedAt: new Date()
      }
    }),
    prisma.page.upsert({
      where: { slug: "privacidad" },
      update: {},
      create: {
        title: "Política de Privacidad",
        slug: "privacidad",
        content: "Política de privacidad del sitio.",
        authorId: admin.id,
        blogId: blog.id,
        publishedAt: new Date()
      }
    }),
    prisma.page.upsert({
      where: { slug: "terminos" },
      update: {},
      create: {
        title: "Términos y Condiciones",
        slug: "terminos",
        content: "Términos y condiciones de uso.",
        authorId: admin.id,
        blogId: blog.id,
        publishedAt: new Date()
      }
    })
  ]);
  console.log({ pages });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
