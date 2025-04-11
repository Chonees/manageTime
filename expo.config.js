const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Excluir la carpeta backend para evitar conflictos con módulos de Node.js
defaultConfig.resolver.blockList = [
  /backend\/.*/,  // Excluir todos los archivos en la carpeta backend
  /node_modules\/mongodb\/.*/  // Excluir mongodb que puede causar problemas
];

module.exports = defaultConfig;
