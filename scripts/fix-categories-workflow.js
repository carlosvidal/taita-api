import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function runScript(scriptName) {
  console.log(`\n=== Ejecutando: ${scriptName} ===`);
  try {
    const { stdout, stderr } = await execAsync(`node scripts/${scriptName}`);
    
    if (stdout) console.log(stdout);
    if (stderr) console.error('Error:', stderr);
    
    return true;
  } catch (error) {
    console.error(`Error al ejecutar ${scriptName}:`, error.message);
    return false;
  }
}

async function main() {
  try {
    // 1. Actualizar categorías existentes
    const updateSuccess = await runScript('update-existing-categories.js');
    if (!updateSuccess) {
      throw new Error('Fallo al actualizar categorías existentes');
    }
    
    // 2. Aplicar restricciones únicas
    const fixSuccess = await runScript('fix-category-constraints.js');
    if (!fixSuccess) {
      throw new Error('Fallo al aplicar restricciones de categorías');
    }
    
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error en el flujo de trabajo:', error.message);
    process.exit(1);
  }
}

// Ejecutar el flujo principal
main();
