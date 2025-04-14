import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const admin = await prisma.admin.create({
      data: {
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: 'ADMIN'
      }
    });
    console.log('Admin creado exitosamente:', admin);
  } catch (error) {
    console.error('Error al crear admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
