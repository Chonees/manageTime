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

    apiUrl: "https://managetime-backend-48f256c2dfe5.herokuapp.com/api",

    // Tiempo de espera para solicitudes API (en milisegundos)
    apiTimeout: 60000,
    // Habilitar logs detallados para depuración
    enableDetailedLogs: true,
    // ID del proyecto EAS
    eas: {
      projectId: "b1d4e758-f8ad-47d6-b479-dd1edcf9b380"
    }
  },
  // Configuración de red para Expo
  packagerOpts: {
    config: "metro.config.js",
    sourceExts: ["js", "jsx", "ts", "tsx", "json"]
  }
};
