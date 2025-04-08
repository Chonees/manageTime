import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configuración específica para cada plataforma
const platformConfig = {
  // Configuración del mapa
  map: {
    // Proveedor del mapa (Google Maps para Android, Apple Maps para iOS)
    provider: Platform.OS === 'android' ? 'google' : 'apple',
    
    // API Key para Google Maps (solo necesaria para Android)
    googleMapsApiKey: 'AIzaSyDGqyJR4KZRJt9qRLmeGjdlgIBt_nb7Kqw',
    
    // Opciones específicas para cada plataforma
    options: {
      android: {
        showsMyLocationButton: true,
        showsUserLocation: true,
        toolbarEnabled: true,
      },
      ios: {
        showsMyLocationButton: true,
        showsUserLocation: true,
        showsCompass: true,
      }
    }
  },
  
  // Configuración de permisos de ubicación
  location: {
    // Precisión de la ubicación
    accuracy: {
      android: 'balanced',
      ios: 'best'
    },
    
    // Tiempo máximo para obtener la ubicación (en ms)
    timeout: 20000,
    
    // Edad máxima aceptable para una ubicación (en ms)
    maximumAge: 10000,
    
    // Opciones específicas por plataforma
    options: {
      android: {
        enableHighAccuracy: true,
        distanceFilter: 5,
        fastestInterval: 5000,
        interval: 10000,
        maxWaitTime: 15000,
        showLocationDialog: true,
        forceRequestLocation: true
      },
      ios: {
        enableHighAccuracy: true,
        distanceFilter: 10,
        activityType: 'other'
      }
    }
  },
  
  // Configuración base
  config: {
    // URL de Heroku (producción)
    apiUrl: detectTunnelUrl() || process.env.API_URL , 
    
    // Configuración optimizada para redes móviles
    timeout: 90000, // 90 segundos
    maxRetries: 5,  // Aumentar reintentos para redes móviles
    retryDelay: 2000, // Retraso base entre reintentos (ms)
  },
  
  // Configuración específica para Android
  android: {
    // En Android, a veces hay problemas con la conexión a localhost o IPs locales
    // Podemos necesitar ajustes específicos
    config: {
      // Aumentar el timeout para Android ya que puede ser más lento
      timeout: 90000, // 90 segundos
      maxRetries: 5,  // Más reintentos para Android
      
      // Opciones adicionales para fetch en Android
      fetchOptions: {
        // Desactivar cache para evitar problemas
        cache: 'no-store',
        // Asegurarse de que las credenciales no se envían automáticamente
        credentials: 'omit',
        // Modo de solicitud (no-cors puede ayudar en algunos casos)
        mode: 'cors',
        // Prioridad alta para las solicitudes
        priority: 'high',
        // No redirigir automáticamente
        redirect: 'manual'
      }
    }
  },
  
  // Configuración para iOS
  ios: {
    config: {
      // iOS suele funcionar bien con la configuración predeterminada
      fetchOptions: {
        cache: 'default',
        credentials: 'same-origin',
        mode: 'cors'
      }
    }
  }
};

// Función para detectar si estamos en modo túnel y obtener la URL correspondiente
function detectTunnelUrl() {
  try {
    // Forzar el uso de la URL de Heroku para dispositivos móviles
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const herokuUrl = process.env.API_URL ;
      console.log('Forzando URL de Heroku para dispositivo móvil:', herokuUrl);
      return herokuUrl;
    }
    
    // Para desarrollo web, también usar Heroku
    console.log('Usando URL de Heroku para web');
    return process.env.API_URL ;
  } catch (error) {
    console.error('Error al detectar modo:', error);
    return process.env.API_URL ;
  }
}

// Función para obtener la configuración específica de la plataforma actual
export const getPlatformConfig = (section) => {
  if (!section) return platformConfig;
  return platformConfig[section] || {};
};

// Función para obtener opciones específicas de la plataforma actual
export const getPlatformOptions = (section) => {
  const config = getPlatformConfig(section);
  if (!config.options) return {};
  
  return config.options[Platform.OS] || {};
};

// Exportar configuración específica para mapas
export const mapConfig = {
  provider: Platform.OS === 'android' ? 'google' : null,
  apiKey: platformConfig.map.googleMapsApiKey,
  ...getPlatformOptions('map')
};

// Función para obtener la URL de la API según la plataforma
export const getApiBaseUrl = () => {
  // Primero intentar detectar si estamos en modo túnel
  const tunnelUrl = detectTunnelUrl();
  if (tunnelUrl) {
    console.log('Usando URL del túnel:', tunnelUrl);
    return tunnelUrl;
  }
  
  // Si no estamos en modo túnel, usar la URL de Heroku
  const config = getPlatformConfig('config');
  console.log('Usando URL de la API estándar:', config.apiUrl);
  return config.apiUrl;
};

// Función para obtener opciones de fetch según la plataforma
export const getFetchOptions = (customOptions = {}) => {
  const config = getPlatformConfig(Platform.OS);
  return {
    ...config.config.fetchOptions,
    ...customOptions
  };
};

// Función para obtener el timeout según la plataforma
export const getTimeout = () => {
  const config = getPlatformConfig(Platform.OS);
  return config.config.timeout;
};

export default platformConfig;
