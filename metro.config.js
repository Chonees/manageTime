// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

// Agregar las carpetas y archivos a excluir
defaultConfig.resolver.blacklistRE = [
  /backend\/.*/,
  /node_modules\/mongodb\/.*/,
  /.*\.git.*/,
];

// Asegurar que solo se procesen archivos del frontend
defaultConfig.watchFolders = [
  path.resolve(__dirname, 'src'),
  path.resolve(__dirname, 'assets'),
];

module.exports = defaultConfig;
