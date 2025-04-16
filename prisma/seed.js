import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.admin.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: "securepassword",
      name: "Admin User",
    },
  });
  console.log({ admin });

  // Crear categorías
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "tecnologia" },
      update: {},
      create: { name: "Tecnología", slug: "tecnologia" }
    }),
    prisma.category.upsert({
      where: { slug: "vida" },
      update: {},
      create: { name: "Vida", slug: "vida" }
    }),
    prisma.category.upsert({
      where: { slug: "noticias" },
      update: {},
      create: { name: "Noticias", slug: "noticias" }
    })
  ]);
  console.log({ categories });

  // Crear posts
  const posts = await Promise.all([
    prisma.post.create({
      data: {
        title: "Primer post de ejemplo",
        slug: "primer-post",
        content: "Este es el contenido del primer post de ejemplo.",
        author: { connect: { id: admin.id } },
        category: { connect: { id: categories[0].id } },
        publishedAt: new Date()
      }
    }),
    prisma.post.create({
      data: {
        title: "Segundo post",
        slug: "segundo-post",
        content: "Contenido del segundo post.",
        author: { connect: { id: admin.id } },
        category: { connect: { id: categories[1].id } },
        publishedAt: new Date()
      }
    }),
    prisma.post.create({
      data: {
        title: "Tercer post",
        slug: "tercer-post",
        content: "Contenido del tercer post.",
        author: { connect: { id: admin.id } },
        category: { connect: { id: categories[2].id } },
        publishedAt: new Date()
      }
    }),
    prisma.post.create({
      data: {
        title: "Cuarto post",
        slug: "cuarto-post",
        content: "Contenido del cuarto post.",
        author: { connect: { id: admin.id } },
        category: { connect: { id: categories[0].id } },
        publishedAt: new Date()
      }
    }),
    prisma.post.create({
      data: {
        title: "Quinto post",
        slug: "quinto-post",
        content: "Contenido del quinto post.",
        author: { connect: { id: admin.id } },
        category: { connect: { id: categories[1].id } },
        publishedAt: new Date()
      }
    })
  ]);
  console.log({ posts });

  // Crear páginas
  const pages = await Promise.all([
    prisma.page.create({
      data: {
        title: "Sobre Nosotros",
        slug: "sobre-nosotros",
        content: "Esta es la página sobre nosotros.",
        author: { connect: { id: admin.id } },
        publishedAt: new Date()
      }
    }),
    prisma.page.create({
      data: {
        title: "Contacto",
        slug: "contacto",
        content: "Página de contacto.",
        author: { connect: { id: admin.id } },
        publishedAt: new Date()
      }
    }),
    prisma.page.create({
      data: {
        title: "Política de Privacidad",
        slug: "privacidad",
        content: "Política de privacidad del sitio.",
        author: { connect: { id: admin.id } },
        publishedAt: new Date()
      }
    }),
    prisma.page.create({
      data: {
        title: "Términos y Condiciones",
        slug: "terminos",
        content: "Términos y condiciones de uso.",
        author: { connect: { id: admin.id } },
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
