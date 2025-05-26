// Configuración segura de variables de entorno
const getEnvVar = (name, defaultValue) => {
  try {
    return process.env[name] || defaultValue;
  } catch (error) {
    console.warn(`Error al acceder a ${name}, usando valor por defecto`, error);
    return defaultValue;
  }
};

// URL por defecto del backend de Heroku
const DEFAULT_API_URL = 'https://managetime-backend-48f256c2dfe5.herokuapp.com/api';

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
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.workproof.app",
    buildNumber: "8",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription: "Esta aplicación requiere acceso a tu biblioteca de fotos para permitirte subir imágenes de verificación de trabajo y ubicación.",
      NSMicrophoneUsageDescription: "Esta aplicación requiere acceso al micrófono para funciones de comunicación con el equipo de trabajo.",
      NSSpeechRecognitionUsageDescription: "Esta aplicación requiere acceso al reconocimiento de voz para permitir comandos por voz en situaciones donde el uso manual no es posible.",
      NSLocationWhenInUseUsageDescription: "Tu ubicación es utilizada para verificar que estás dentro del área de trabajo asignada y registrar tus actividades.",
      NSLocationAlwaysAndWhenInUseUsageDescription: "Esta aplicación requiere acceso continuo a tu ubicación para verificar tu presencia en el área de trabajo asignada.",
      NSCameraUsageDescription: "Esta aplicación utiliza la cámara para documentar la verificación de trabajo.",
      NSBluetoothAlwaysUsageDescription: "Esta aplicación puede utilizar Bluetooth para detectar la proximidad a dispositivos relevantes en el sitio de trabajo.",
      NSCalendarsUsageDescription: "Esta aplicación puede acceder a tu calendario para programar tareas y recordatorios."
    },
    requireFullScreen: true
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#282828"
    },
    softwareKeyboardLayoutMode: "pan",
    package: "com.workproof.app"
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  extra: {
    // Configuración para diferentes entornos
    
    // Usar valor por defecto si la variable de entorno no está disponible
    apiUrl: getEnvVar('API_URL', DEFAULT_API_URL),

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
