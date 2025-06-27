#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk') || { green: text => text, yellow: text => text, red: text => text };

console.log(chalk.green('🚀 Iniciando corrección de alertas de Xcode para el proyecto ManageTime/Workproof'));

// Verificar si estamos en el directorio correcto
if (!fs.existsSync('./package.json')) {
  console.error(chalk.red('❌ Error: Este script debe ejecutarse desde la raíz del proyecto ManageTime'));
  process.exit(1);
}

// Paso 1: Actualizar package.json si es necesario
try {
  console.log(chalk.yellow('📦 Verificando package.json...'));
  const packageJson = JSON.parse(fs.readFileSync('./package.json'));
  
  // Asegurar que las versiones sean compatibles con Expo SDK 52
  const requiredVersions = {
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-native": "0.73.6",
    "expo": "~52.0.0"
  };

  let packagesUpdated = false;
  
  Object.entries(requiredVersions).forEach(([pkg, version]) => {
    if (packageJson.dependencies[pkg] !== version) {
      console.log(chalk.yellow(`Actualizando ${pkg} a ${version}`));
      packageJson.dependencies[pkg] = version;
      packagesUpdated = true;
    }
  });

  if (packagesUpdated) {
    fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
    console.log(chalk.green('✅ package.json actualizado correctamente'));
  } else {
    console.log(chalk.green('✅ package.json ya tiene las versiones correctas'));
  }
} catch (error) {
  console.error(chalk.red(`❌ Error al actualizar package.json: ${error.message}`));
}

// Paso 2: Verificar si existen los directorios ios e ios-backup
console.log(chalk.yellow('📁 Verificando directorios iOS...'));

const iosBackupPath = path.join(__dirname, 'ios-backup');
const iosPath = path.join(__dirname, 'ios');

if (!fs.existsSync(iosBackupPath)) {
  console.error(chalk.red('❌ No se encontró el directorio ios-backup. Asegúrate de que existe.'));
} else {
  console.log(chalk.green('✅ Directorio ios-backup encontrado'));
}

// Paso 3: Mostrar instrucciones para completar la corrección
console.log('\n' + chalk.green('📋 INSTRUCCIONES PARA COMPLETAR LA CORRECCIÓN:'));
console.log(chalk.yellow('1. Ejecuta estos comandos en Terminal para reinstalar los pods con las nuevas configuraciones:'));
console.log(`
   cd ${iosBackupPath || 'ios-backup'}
   rm -rf Pods
   rm -rf Podfile.lock
   pod install --repo-update
`);

console.log(chalk.yellow('2. Una vez que pod install haya terminado, abre el proyecto en Xcode:'));
console.log(`   open ${iosBackupPath}/Workproof.xcworkspace`);

console.log(chalk.yellow('3. En Xcode, selecciona el proyecto y actualiza la configuración a la recomendada:'));
console.log('   - Project > Workproof > "Update to recommended settings"');

console.log(chalk.yellow('4. Selecciona todos los targets y actualiza también sus configuraciones'));

console.log(chalk.green('\n📱 Después de estos pasos, la mayoría de las alertas deberían desaparecer. Algunas alertas menores pueden persistir, pero no afectarán el funcionamiento de la aplicación.'));
