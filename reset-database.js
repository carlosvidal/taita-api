// Script para resetear la base de datos y ejecutar migraciones y seeds
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Iniciando reseteo de base de datos...');

try {
  // 1. Ejecutar prisma migrate reset (esto elimina todos los datos y ejecuta las migraciones)
  console.log('Ejecutando prisma migrate reset...');
  execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
  
  // 2. Ejecutar prisma generate para actualizar el cliente de Prisma
  console.log('Ejecutando prisma generate...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // 3. Ejecutar seed para poblar la base de datos con datos iniciales
  console.log('Ejecutando seed...');
  execSync('npx prisma db seed', { stdio: 'inherit' });
  
  console.log('Base de datos reseteada y poblada con éxito!');
} catch (error) {
  console.error('Error al resetear la base de datos:', error);
  process.exit(1);
}
