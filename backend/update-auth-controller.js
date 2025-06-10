const fs = require('fs');
const path = require('path');

// Ruta al archivo auth.controller.js
const authControllerPath = path.join(__dirname, 'src', 'controllers', 'auth.controller.js');

// Leer el contenido actual del archivo
fs.readFile(authControllerPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error al leer el archivo:', err);
    return;
  }
  
  console.log('Archivo leído correctamente');
  
  // Actualizar el token JWT para incluir isSuperAdmin
  let updatedContent = data.replace(
    /const token = jwt\.sign\(\s*{\s*id:\s*user\._id,\s*isAdmin:\s*user\.isAdmin\s*},/g,
    'const token = jwt.sign(\n      { id: user._id, isAdmin: user.isAdmin, isSuperAdmin: user.isSuperAdmin },'
  );
  
  // Actualizar la respuesta del usuario para incluir isSuperAdmin
  updatedContent = updatedContent.replace(
    /const userResponse = {\s*id: user\._id,\s*username: user\.username,\s*email: user\.email,\s*isAdmin: user\.isAdmin,\s*isActive: user\.isActive,\s*createdAt: user\.createdAt\s*};/g,
    'const userResponse = {\n      id: user._id,\n      username: user.username,\n      email: user.email,\n      isAdmin: user.isAdmin,\n      isSuperAdmin: user.isSuperAdmin,\n      isActive: user.isActive,\n      createdAt: user.createdAt\n    };'
  );
  
  // Guardar el archivo actualizado
  fs.writeFile(authControllerPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error al escribir el archivo:', err);
      return;
    }
    console.log('¡El archivo auth.controller.js ha sido actualizado correctamente!');
  });
});
