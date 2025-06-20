// Cargar variables de entorno
import 'dotenv/config';

// Configuración de Expo
module.exports = {
  name: "Workproof",
  slug: "manage-time",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#282828"
  },
  updates: {
    url: "https://u.expo.dev/b1d4e758-f8ad-47d6-b479-dd1edcf9b380",
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: [
    "**/*"
  ],
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#282828"
    },
    softwareKeyboardLayoutMode: "pan",
    package: "com.workproof.app",
    runtimeVersion: "1.0.0"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.workproof.app",
    buildNumber: "6",
    runtimeVersion: {
      policy: "appVersion"
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription: "Esta aplicación requiere acceso a tu biblioteca de fotos para permitirte subir imágenes de verificación de trabajo y ubicación.",
      NSMicrophoneUsageDescription: "Esta aplicación requiere acceso al micrófono para funciones de comunicación con el equipo de trabajo.",
      NSSpeechRecognitionUsageDescription: "Esta aplicación requiere acceso al reconocimiento de voz para permitir comandos por voz en situaciones donde el uso manual no es posible.",
      NSLocationWhenInUseUsageDescription: "Tu ubicación es utilizada para verificar que estás dentro del área de trabajo asignada y registrar tus actividades.",
      NSLocationAlwaysAndWhenInUseUsageDescription: "Esta aplicación requiere acceso continuo a tu ubicación para verificar tu presencia en el área de trabajo asignada."
    }
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  extra: {
    // Configuración para diferentes entornos
    
    // Usar exclusivamente la variable de entorno
    apiUrl: `${process.env.API_URL}/api`,

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
