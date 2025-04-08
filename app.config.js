// Configuración de Expo
module.exports = {
  name: "ManageTime",
  slug: "manage-time",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  updates: {
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FFFFFF"
    },
    softwareKeyboardLayoutMode: "pan",
    package: "com.managetime.app"
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  extra: {
    // Configuración para diferentes entornos
    apiUrl: "http://192.168.31.174:5555/api",
    // Tiempo de espera para solicitudes API (en milisegundos)
    apiTimeout: 15000,
    // Habilitar logs detallados para depuración
    enableDetailedLogs: true
  },
  // Configuración de red para Expo
  packagerOpts: {
    config: "metro.config.js",
    sourceExts: ["js", "jsx", "ts", "tsx", "json"]
  }
};
