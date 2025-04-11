import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserRole() {
  try {
    const updatedUser = await prisma.admin.update({
      where: { email: 'admin@example.com' },
      data: { role: 'ADMIN' }
    });
    console.log('Usuario actualizado:', updatedUser);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole();
