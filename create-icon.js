const Jimp = require('jimp');

async function createIcon() {
  try {
    // Cargar la imagen del logo
    const logo = await Jimp.read('./assets/Work Proof LOGO CREMA.png');
    
    // Crear un nuevo lienzo de 1024x1024 píxeles con fondo transparente
    const canvas = new Jimp(1024, 1024, 0x00000000);
    
    // Redimensionar el logo para que ocupe casi todo el espacio
    // Calculamos el tamaño más grande que puede tener manteniendo la proporción
    const scaleFactor = Math.min(1024 / logo.getWidth(), 1024 / logo.getHeight());
    const newWidth = logo.getWidth() * scaleFactor;
    const newHeight = logo.getHeight() * scaleFactor;
    
    logo.resize(newWidth, newHeight);
    
    // Calcular la posición para centrar el logo en el lienzo
    const x = (1024 - newWidth) / 2;
    const y = (1024 - newHeight) / 2;
    
    // Componer la imagen final
    canvas.composite(logo, x, y);
    
    // Guardar como icon.png
    await canvas.writeAsync('./assets/icon.png');
    
    // También crear una versión para splash screen
    const splash = new Jimp(1024, 1024, 0x282828FF); // Fondo gris oscuro
    splash.composite(logo, x, y);
    await splash.writeAsync('./assets/splash.png');
    
    console.log('Íconos creados exitosamente!');
  } catch (error) {
    console.error('Error al crear íconos:', error);
  }
}

createIcon();
