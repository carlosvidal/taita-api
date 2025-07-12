import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updatePostsStatus() {
  try {
    const result = await prisma.post.updateMany({
      where: {
        status: "DRAFT"
      },
      data: {
        status: "PUBLISHED"
      }
    });
    
    console.log(`Updated ${result.count} posts to PUBLISHED status`);
    
    // También actualizar las páginas
    const pagesResult = await prisma.page.updateMany({
      where: {
        status: "DRAFT"
      },
      data: {
        status: "PUBLISHED"
      }
    });
    
    console.log(`Updated ${pagesResult.count} pages to PUBLISHED status`);
    
  } catch (error) {
    console.error("Error updating posts:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePostsStatus();