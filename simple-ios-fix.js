/**
 * Script para aplicar una solución simple al problema de audio en iOS
 * Utiliza una configuración básica mínima que debería funcionar en Expo 52
 */

const fs = require('fs');
const path = require('path');

// Ruta al archivo VoiceListener.js
const voiceListenerPath = path.join(__dirname, 'src', 'components', 'VoiceListener.js');

// Leer el archivo
console.log(`Leyendo archivo: ${voiceListenerPath}`);
let content = fs.readFileSync(voiceListenerPath, 'utf8');

// Configuración SIMPLIFICADA de audio para iOS que se añadirá
const iosAudioConfig = `
    // Configuración simplificada para iOS
    if (Platform.OS === 'ios') {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });
      addDebugMessage('Audio mode configurado para iOS (versión simple)');
    }
`;

// Configuración simplificada para el useEffect
const iosAudioConfigUseEffect = `
    // Configuración simplificada para iOS
    if (Platform.OS === 'ios') {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      }).then(() => {
        addDebugMessage('Audio mode configurado para iOS (versión simple)');
        startListeningCycle();
      }).catch(error => {
        addDebugMessage(\`Error configurando audio mode: \${error.message}\`);
      });
    } else {
      startListeningCycle();
    }
`;

// Patrones para buscar dónde insertar el código
const patterns = [
  {
    // En useEffect
    search: /if \(isTaskActive\) \{[\s\S]*?startListeningCycle\(\);/,
    replace: (match) => {
      return match.replace('startListeningCycle();', iosAudioConfigUseEffect);
    }
  },
  {
    // En startListeningForKeyword
    search: /const startListeningForKeyword[\s\S]*?if \(status !== 'granted'\) \{[\s\S]*?return;[\s\S]*?\}/,
    replace: (match) => {
      return match.replace(/if \(status !== 'granted'\) \{[\s\S]*?return;[\s\S]*?\}/, (subMatch) => {
        return subMatch + iosAudioConfig;
      });
    }
  },
  {
    // En startListeningForNote
    search: /const startListeningForNote[\s\S]*?await ensureNoActiveRecordings\(\);/,
    replace: (match) => {
      return match.replace(/await ensureNoActiveRecordings\(\);/, (subMatch) => {
        return subMatch + iosAudioConfig;
      });
    }
  },
  {
    // En startListeningForConfirmation
    search: /const startListeningForConfirmation[\s\S]*?await ensureNoActiveRecordings\(\);/,
    replace: (match) => {
      return match.replace(/await ensureNoActiveRecordings\(\);/, (subMatch) => {
        return subMatch + iosAudioConfig;
      });
    }
  }
];

// Hacer las modificaciones
let modifiedContent = content;
let modificationsCount = 0;

patterns.forEach(pattern => {
  const newContent = modifiedContent.replace(pattern.search, pattern.replace);
  if (newContent !== modifiedContent) {
    modificationsCount++;
    modifiedContent = newContent;
  }
});

if (modificationsCount === 0) {
  console.error('No se encontraron puntos para insertar las correcciones de iOS');
  process.exit(1);
}

// Crear una copia de seguridad del archivo original
const backupPath = voiceListenerPath + '.backup3';
fs.writeFileSync(backupPath, content, 'utf8');
console.log(`Archivo original respaldado en: ${backupPath}`);

// Guardar el archivo modificado
fs.writeFileSync(voiceListenerPath, modifiedContent, 'utf8');
console.log(`Archivo modificado guardado con éxito. Se realizaron ${modificationsCount} cambios.`);

console.log('Corrección simplificada completada. Reinicia la aplicación para aplicar los cambios.');
