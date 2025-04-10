// API URL - Cambia esto a la URL de tu backend
// Asegúrate de que esta IP sea accesible desde tu dispositivo móvil
// Si estás usando Expo en un dispositivo físico, necesitas usar la IP de tu computadora en la red local
import { Platform } from 'react-native';
import { getApiBaseUrl, getFetchOptions, getTimeout, getPlatformConfig } from './platform-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = getApiBaseUrl();

// URL alternativa para usar con Expo en modo de desarrollo
// Esta URL se usa cuando se detecta que estamos en un entorno Expo
export const getApiUrl = () => {
  // Usar la configuración específica para cada plataforma
  return getApiBaseUrl();
};

// Helper function to handle fetch errors
export const handleResponse = async (response) => {
  console.log(`Respuesta recibida con status: ${response.status}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.log('Error en la respuesta:', errorData);
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json().catch(() => ({}));
  console.log('Datos recibidos:', JSON.stringify(data).substring(0, 100) + '...');
  return data;
};

// Función para realizar peticiones con reintentos automáticos
export const fetchWithRetry = async (url, options, maxRetries = null) => {
  // Obtener configuración según la plataforma
  const config = getPlatformConfig(Platform.OS);
  
  // Usar maxRetries pasado como parámetro o el de la configuración
  const retries = maxRetries || config.config.maxRetries || 2;
  const retryDelay = config.config.retryDelay || 1000;
  const timeout = getTimeout();
  
  console.log(`Configuración de red: timeout=${timeout}ms, maxRetries=${retries}, retryDelay=${retryDelay}ms`);
  console.log(`Realizando petición a: ${url}`);
  
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Si no es el primer intento, esperar antes de reintentar
      if (attempt > 0) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        console.log(`Reintentando petición (${attempt}/${retries}) después de ${delay}ms...`);
        // Esperar un tiempo exponencial entre reintentos (1s, 2s, 4s, etc.)
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Crear un nuevo AbortController para este intento
      const controller = new AbortController();
      
      // Establecer un timeout para este intento
      const timeoutId = setTimeout(() => {
        console.log(`Timeout alcanzado (${timeout}ms) en intento ${attempt+1}/${retries+1}`);
        controller.abort();
      }, timeout);
      
      console.log(`Intento ${attempt+1}/${retries+1} - Iniciando petición...`);
      
      // Combinar las opciones pasadas con la señal del AbortController
      const fetchOptions = {
        ...options,
        signal: controller.signal
      };
      
      // Realizar la petición
      const response = await fetch(url, fetchOptions);
      
      // Limpiar el timeout si la petición se completó
      clearTimeout(timeoutId);
      
      console.log(`Intento ${attempt+1}/${retries+1} - Respuesta recibida con status: ${response.status}`);
      
      // Devolver la respuesta si se completó correctamente
      return response;
    } catch (error) {
      console.error(`Error en intento ${attempt+1}/${retries+1}:`, error);
      lastError = error;
      
      // Si el error no es por timeout o es el último intento, no reintentar
      if (error.name !== 'AbortError' || attempt >= retries) {
        console.log(`No se reintentará: ${error.name !== 'AbortError' ? 'No es un error de timeout' : 'Se agotaron los reintentos'}`);
        throw error;
      }
      
      console.log(`Error de timeout, se reintentará...`);
    }
  }
  
  // Si llegamos aquí, es porque se agotaron los reintentos
  console.error(`Se agotaron todos los reintentos (${retries+1} intentos)`);
  throw new Error(lastError?.message || 'Tiempo de espera agotado después de varios intentos');
};

// Helper function to get auth header
export const getAuthHeader = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  } catch (error) {
    console.error('Error al obtener token de autenticación:', error);
    return {};
  }
};

// Helper function to create fetch options with auth token
export const createFetchOptions = async (method, body = null) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    console.log('Created fetch options:', JSON.stringify(options, null, 2));
    return options;
  } catch (error) {
    console.error('Error creating fetch options:', error);
    throw error;
  }
};

// Login function
export const login = async (username, password) => {
  console.log(`Intentando login con usuario: ${username}`);
  
  try {
    const url = `${getApiUrl()}/api/auth/login`;
    console.log('URL de login:', url);
    
    // Crear opciones específicas para el login
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ username, password })
    };
    
    console.log('Opciones de login:', JSON.stringify(options, null, 2));
    
    // Usar la función directa para el login (más confiable)
    const loginResult = await new Promise((resolve, reject) => {
      // Usar XMLHttpRequest que puede ser más estable en algunos dispositivos Android
      const xhr = new XMLHttpRequest();
      
      // Establecer un timeout largo para el login
      const timeout = setTimeout(() => {
        console.error('Timeout en login después de 2 minutos');
        xhr.abort();
        reject(new Error('Tiempo de espera agotado en login'));
      }, 120000); // 2 minutos
      
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          clearTimeout(timeout);
          
          console.log('Respuesta XHR login recibida, status:', xhr.status);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const responseData = JSON.parse(xhr.responseText);
              resolve(responseData);
            } catch (e) {
              reject(new Error('Error al procesar respuesta de login'));
            }
          } else if (xhr.status === 404) {
            reject(new Error('Usuario no encontrado'));
          } else {
            reject(new Error(`Error en login: ${xhr.status} ${xhr.statusText}`));
          }
        }
      };
      
      xhr.onerror = function(e) {
        clearTimeout(timeout);
        console.error('Error XHR en login:', e);
        reject(new Error('Error de red en login'));
      };
      
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send(JSON.stringify({ username, password }));
      
      console.log('Petición XHR de login enviada');
    });
    
    console.log('Login exitoso, guardando token y datos de usuario');
    
    // Si hay token, lo guardamos en AsyncStorage
    if (loginResult.token) {
      try {
        await AsyncStorage.setItem('token', loginResult.token);
        console.log('Token guardado correctamente');
        
        // Si hay datos de usuario, los guardamos en AsyncStorage
        if (loginResult.user) {
          await AsyncStorage.setItem('user', JSON.stringify(loginResult.user));
          console.log('Datos de usuario guardados correctamente');
        }
      } catch (storageError) {
        console.error('Error al guardar en AsyncStorage:', storageError);
        // Continuamos a pesar del error para devolver los datos al usuario
      }
    }
    
    return {
      success: true,
      user: loginResult.user,
      token: loginResult.token
    };
  } catch (error) {
    console.error('Error en login:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido en el inicio de sesión'
    };
  }
};

// Register function
export const register = async (username, password, email) => {
  try {
    console.log('Enviando solicitud de registro a:', `${getApiUrl()}/api/auth/register`);
    console.log('Datos:', { username, email, password: '********' });
    
    // Establecemos un timeout para la solicitud
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout()); // Timeout según la plataforma
    
    try {
      // Usamos opciones básicas en lugar de createFetchOptions para evitar problemas
      const response = await fetch(`${getApiUrl()}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, email }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Si la respuesta no es exitosa, lanzamos un error
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }
      
      // Procesamos la respuesta
      const data = await response.json();
      console.log('Registro exitoso:', data.message || 'Usuario registrado correctamente');
      
      return {
        success: true,
        message: data.message || 'Usuario registrado correctamente'
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado. Verifica tu conexión a internet o intenta más tarde.');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return {
      success: false,
      error: error.message || 'Error al registrar usuario'
    };
  }
};

// Function to verify if token is valid
export const checkToken = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    console.log('Verificando token:', token ? 'Token existe' : 'No hay token');
    
    if (!token) {
      console.log('No hay token, retornando valid: false');
      return { valid: false };
    }
    
    // Primero intentamos obtener el usuario del almacenamiento local
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        console.log('Usuario recuperado del almacenamiento:', user);
        
        // Intentamos verificar el token en segundo plano, pero no esperamos la respuesta
        // Esto evita que la aplicación se quede cargando si hay problemas de red
        fetch(`${getApiUrl()}/api/auth/check-token`, {
          method: 'GET',
          headers: await getAuthHeader()
        }).then(async (response) => {
          if (!response.ok) {
            console.log('Token inválido según el servidor, limpiando almacenamiento');
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
          }
        }).catch(e => {
          console.log('Error al verificar token en segundo plano:', e);
        });
        
        // Retornamos inmediatamente con los datos del usuario
        return { valid: true, user };
      }
    } catch (e) {
      console.log('Error al recuperar usuario del almacenamiento:', e);
    }
    
    // Si no tenemos datos del usuario en el almacenamiento, intentamos obtenerlos del servidor
    console.log('Enviando solicitud a:', `${getApiUrl()}/api/auth/check-token`);
    
    // Establecemos un timeout para la solicitud
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout()); // Timeout según la plataforma
    
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/check-token`, {
        method: 'GET',
        headers: await getAuthHeader(),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('Respuesta recibida, status:', response.status);
      
      if (!response.ok) {
        console.log('Token inválido, limpiando almacenamiento');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        return { valid: false };
      }
      
      const data = await response.json();
      console.log('Datos de respuesta:', data);
      
      // Guardar datos del usuario
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('La solicitud de verificación de token ha excedido el tiempo de espera');
        // Asumimos que el token es válido temporalmente
        return { valid: true, user: { username: 'Usuario' }, offline: true };
      }
      throw error;
    }
  } catch (error) {
    console.error('Error al verificar token:', error);
    
    // Si hay un error, intentamos usar los datos del usuario almacenados localmente
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        console.log('Usando datos de usuario almacenados debido a error:', error.message);
        return { valid: true, user, offline: true };
      }
    } catch (e) {
      console.log('Error al recuperar usuario del almacenamiento:', e);
    }
    
    return { valid: false, error: error.message };
  }
};

// Logout function
export const logout = async () => {
  try {
    // Remove token and user data
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    
    return { success: true };
  } catch (error) {
    console.error('Error en logout:', error);
    throw error;
  }
};

// Function to start work
export const startWork = async (coords) => {
  try {
    console.log('API startWork - Enviando coordenadas:', coords);
    
    if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
      throw new Error('Coordenadas inválidas');
    }
    
    // Asegurarnos de que las coordenadas sean strings para evitar problemas de serialización
    const payload = {
      latitude: String(coords.latitude),
      longitude: String(coords.longitude)
    };
    
    console.log('API startWork - Payload final:', payload);
    
    const headers = await getAuthHeader();
    headers['Content-Type'] = 'application/json';
    
    const response = await fetchWithRetry(`${getApiUrl()}/api/locations/start`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    // Iniciar el seguimiento de ruta si está disponible
    try {
      const locationService = require('./location-service');
      if (locationService && typeof locationService.startRouteTracking === 'function') {
        await locationService.startRouteTracking();
        console.log('Seguimiento de ruta iniciado con éxito');
      }
    } catch (trackingError) {
      console.warn('No se pudo iniciar el seguimiento de ruta:', trackingError);
      // No interrumpimos el flujo principal si falla el seguimiento
    }
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error al iniciar trabajo:', error);
    throw error;
  }
};

// Function to end work
export const endWork = async (coords) => {
  try {
    console.log('API endWork - Enviando coordenadas:', coords);
    
    if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
      throw new Error('Coordenadas inválidas');
    }
    
    // Detener el seguimiento de ruta si está disponible
    try {
      const locationService = require('./location-service');
      if (locationService && typeof locationService.stopRouteTracking === 'function') {
        locationService.stopRouteTracking();
        console.log('Seguimiento de ruta detenido con éxito');
      }
    } catch (trackingError) {
      console.warn('No se pudo detener el seguimiento de ruta:', trackingError);
      // No interrumpimos el flujo principal si falla
    }
    
    // Asegurarnos de que las coordenadas sean strings para evitar problemas de serialización
    const payload = {
      latitude: String(coords.latitude),
      longitude: String(coords.longitude)
    };
    
    console.log('API endWork - Payload final:', payload);
    
    const headers = await getAuthHeader();
    headers['Content-Type'] = 'application/json';
    
    const response = await fetchWithRetry(`${getApiUrl()}/api/locations/end`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error al finalizar trabajo:', error);
    throw error;
  }
};

// Function to get location history
export const getLocationHistory = async (userId) => {
  try {
    let url = `${getApiUrl()}/api/locations/my-history`;
    
    // If admin is requesting a specific user's history
    if (userId) {
      url = `${getApiUrl()}/api/locations/user/${userId}`;
    }
    
    console.log('Obteniendo historial de ubicaciones desde:', url);
    
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error response from location history:', errorData);
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Location history response:', data);
    return data;
  } catch (error) {
    console.error('Error in getLocationHistory:', error);
    throw error;
  }
};

// Function to get all users (admin only)
export const getUsers = async () => {
  try {
    console.log('Obteniendo lista de usuarios desde:', `${getApiUrl()}/api/users`);
    
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
      console.error('Error al obtener token de AsyncStorage:', storageError);
      throw new Error('No se pudo acceder al token de autenticación');
    }
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    // Establecemos un timeout para la solicitud
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const response = await fetchWithRetry(`${getApiUrl()}/api/users`, options);
    
    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    // Procesamos la respuesta
    const data = await response.json();
    console.log(`Se obtuvieron ${data.length} usuarios`);
    
    return data;
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    throw error;
  }
};

// Function to get current user tasks
export const getUserTasks = async () => {
  try {
    console.log('Obteniendo tareas del usuario desde:', `${getApiUrl()}/api/tasks/my-tasks`);
    
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
      console.error('Error al obtener token de AsyncStorage:', storageError);
      throw new Error('No se pudo acceder al token de autenticación');
    }
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    // Establecemos un timeout para la solicitud
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const response = await fetchWithRetry(`${getApiUrl()}/api/tasks/my-tasks`, options);
    
    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    // Procesamos la respuesta
    const data = await response.json();
    console.log(`Se obtuvieron ${data.length} tareas del usuario`);
    
    return data;
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    throw error;
  }
};

// Function to save a task
export const saveTask = async (task) => {
  try {
    // Obtenemos el token de autenticación
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
      console.error('Error al obtener token de AsyncStorage:', storageError);
      throw new Error('No se pudo acceder al token de autenticación');
    }
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    // Establecemos un timeout para la solicitud
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(task)
    };
    
    const response = await fetchWithRetry(`${getApiUrl()}/api/tasks`, options);
    
    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    // Procesamos la respuesta
    const responseData = await response.json();
    console.log('Tarea guardada correctamente:', responseData);
    
    return {
      task: {
        ...responseData,
        completed: responseData.completed !== undefined ? responseData.completed : false,
        // Asegurar que se devuelvan los datos de ubicación si existen
        location: responseData.location || null,
        radius: responseData.radius || null,
        locationName: responseData.locationName || ''
      }
    };
  } catch (error) {
    console.error('Error al guardar tarea:', error);
    throw error;
  }
};

// Function to get all tasks (admin)
export const getTasks = async () => {
  try {
    console.log('Obteniendo todas las tareas desde:', `${getApiUrl()}/api/tasks/all`);
    
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
      console.error('Error al obtener token de AsyncStorage:', storageError);
      throw new Error('No se pudo acceder al token de autenticación');
    }
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    // Establecemos un timeout para la solicitud
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const response = await fetchWithRetry(`${getApiUrl()}/api/tasks/all`, options);
    
    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    // Procesamos la respuesta
    const data = await response.json();
    console.log(`Se obtuvieron ${data.length} tareas`);
    
    return data;
  } catch (error) {
    console.error('Error al obtener todas las tareas:', error);
    throw error;
  }
};

// Function to delete a task
export const deleteTask = async (taskId) => {
  try {
    console.log('Eliminando tarea:', taskId);
    
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
      console.error('Error al obtener token de AsyncStorage:', storageError);
      throw new Error('No se pudo acceder al token de autenticación');
    }
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    // Establecemos un timeout para la solicitud
    const options = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const response = await fetchWithRetry(`${getApiUrl()}/api/tasks/${taskId}`, options);
    
    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    // Procesamos la respuesta
    const data = await response.json();
    console.log('Tarea eliminada correctamente');
    
    return data;
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    throw error;
  }
};

// Función para probar directamente la conexión con el backend sin usar fetchWithRetry
export const directConnectionTest = async () => {
  try {
    console.log('Realizando prueba de conexión directa con:', getApiUrl());
    
    // Crear una promesa que se resolverá con el resultado de la petición
    return new Promise((resolve, reject) => {
      // Establecer un timeout largo para esta prueba
      const timeout = setTimeout(() => {
        console.error('Timeout en prueba directa después de 2 minutos');
        reject(new Error('Timeout en prueba directa después de 2 minutos'));
      }, 120000); // 2 minutos
      
      // Usar XMLHttpRequest que puede ser más estable en algunos dispositivos Android
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          clearTimeout(timeout);
          
          console.log('Respuesta XHR recibida, status:', xhr.status);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const responseData = JSON.parse(xhr.responseText);
              resolve({
                success: true,
                status: xhr.status,
                message: 'Conexión directa exitosa',
                data: responseData
              });
            } catch (e) {
              resolve({
                success: true,
                status: xhr.status,
                message: 'Conexión directa exitosa pero respuesta no es JSON válido',
                data: { text: xhr.responseText }
              });
            }
          } else {
            reject(new Error(`Error en conexión directa: ${xhr.status} ${xhr.statusText}`));
          }
        }
      };
      
      xhr.onerror = function(e) {
        clearTimeout(timeout);
        console.error('Error XHR:', e);
        reject(new Error('Error de red en conexión directa'));
      };
      
      xhr.open('GET', getApiUrl(), true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send();
      
      console.log('Petición XHR enviada');
    });
  } catch (error) {
    console.error('Error en prueba de conexión directa:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido en prueba de conexión directa'
    };
  }
};

// Function to test connection
export const testConnection = async () => {
  try {
    console.log('Probando conexión con:', getApiUrl());
    
    // Primero intentar con XMLHttpRequest directo
    try {
      console.log('Intentando conexión directa con XMLHttpRequest...');
      const directResult = await directConnectionTest();
      console.log('Resultado de conexión directa:', directResult);
      return directResult;
    } catch (directError) {
      console.log('Conexión directa falló, intentando con fetchWithRetry:', directError);
      // Si falla, intentar con fetchWithRetry
    }
    
    const url = `${getApiUrl()}`;
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Usar la nueva función con reintentos
    const response = await fetchWithRetry(url, options, 3); // 3 reintentos para la prueba de conexión
    
    console.log('Respuesta recibida, status:', response.status);
    
    // Intentar leer el cuerpo de la respuesta
    let responseBody;
    try {
      const text = await response.text();
      console.log('Texto de respuesta:', text.substring(0, 150) + '...');
      responseBody = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('Error al parsear respuesta JSON:', e);
      return { 
        success: response.ok, 
        status: response.status,
        message: `Conexión exitosa pero respuesta no es JSON válido: ${response.statusText}`
      };
    }
    
    return {
      success: true,
      status: response.status,
      message: responseBody.message || 'Conexión exitosa',
      data: responseBody
    };
  } catch (error) {
    console.error('Error en testConnection:', error);
    return { 
      success: false, 
      error: error.message || 'Error al probar la conexión'
    };
  }
};

// Función para probar el inicio de sesión
export const testLogin = async (username, password) => {
  try {
    console.log(`Probando login con usuario: ${username}`);
    
    const url = `${getApiUrl()}/api/auth/login`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    };
    
    // Usar la nueva función con reintentos
    const response = await fetchWithRetry(url, options);
    
    console.log('Respuesta recibida, status:', response.status);
    
    // Intentar leer el cuerpo de la respuesta
    let responseBody;
    try {
      const text = await response.text();
      console.log('Texto de respuesta:', text.substring(0, 150) + '...');
      responseBody = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('Error al parsear respuesta JSON:', e);
      return { 
        success: false, 
        status: response.status,
        error: 'Error al procesar la respuesta del servidor'
      };
    }
    
    if (!response.ok) {
      return { 
        success: false, 
        status: response.status,
        error: responseBody.message || `Error ${response.status}: ${response.statusText}`
      };
    }
    
    return {
      success: true,
      status: response.status,
      message: 'Login exitoso',
      user: responseBody.user,
      token: responseBody.token
    };
  } catch (error) {
    console.error('Error en testLogin:', error);
    return { 
      success: false, 
      error: error.message || 'Error al probar el login'
    };
  }
};

// Function to assign a task to another user (admin only)
export const assignTask = async (taskData) => {
  try {
    console.log('Asignando tarea a otro usuario:', JSON.stringify(taskData));
    
    if (!taskData.userId) {
      throw new Error('Se requiere el ID del usuario para asignar la tarea');
    }
    
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
      console.error('Error al obtener token de AsyncStorage:', storageError);
      throw new Error('No se pudo acceder al token de autenticación');
    }
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    // Establecemos un timeout para la solicitud
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...taskData,
        userId: taskData.userId.toString()
      })
    };
    
    const response = await fetchWithRetry(`${getApiUrl()}/api/tasks/assign`, options);
    
    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    // Procesamos la respuesta
    const responseData = await response.json();
    console.log('Tarea asignada correctamente:', responseData);
    
    return {
      task: {
        ...responseData,
        completed: responseData.completed !== undefined ? responseData.completed : false,
        // Asegurar que se devuelvan los datos de ubicación si existen
        location: responseData.location || null,
        radius: responseData.radius || null,
        locationName: responseData.locationName || ''
      }
    };
  } catch (error) {
    console.error('Error al asignar tarea:', error);
    throw error;
  }
};

// Function to get admin statistics
export const getAdminStats = async () => {
  try {
    // Obtenemos el token de autenticación
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
      console.error('Error al obtener token de AsyncStorage:', storageError);
      throw new Error('No se pudo acceder al token de autenticación');
    }
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    // Establecemos un timeout para la solicitud
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const response = await fetchWithRetry(`${getApiUrl()}/api/stats`, options);
    
    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    // Procesamos la respuesta
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    throw error;
  }
};

// Function to get recent activities
export const getRecentActivities = async () => {
  try {
    const url = `${getApiUrl()}/api/stats/recent-activity`;
    const options = await createFetchOptions('GET');
    
    console.log('Fetching recent activities from:', url);
    const response = await fetchWithRetry(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error response from recent activities:', errorData);
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Received activities data:', JSON.stringify(data, null, 2));
    
    if (!Array.isArray(data)) {
      console.error('Invalid response format:', data);
      return [];
    }
    
    // Transform the data to match the expected format
    const transformedData = data.map(activity => ({
      id: activity.id || activity._id,
      type: activity.type,
      action: activity.action,
      username: activity.username,
      title: activity.title,
      message: activity.message,
      timestamp: activity.timestamp,
      metadata: activity.metadata || {}
    }));
    
    console.log('Transformed activities data:', JSON.stringify(transformedData, null, 2));
    return transformedData;
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }
};

// Function to get nearby tasks based on location
export const getNearbyTasks = async (longitude, latitude, maxDistance = 10000) => {
  try {
    // Obtenemos el token de autenticación
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
      console.error('Error al obtener token de AsyncStorage:', storageError);
      throw new Error('No se pudo acceder al token de autenticación');
    }
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    // Construir la URL con los parámetros de consulta
    const url = `${getApiUrl()}/api/tasks/nearby?longitude=${longitude}&latitude=${latitude}&maxDistance=${maxDistance}`;
    
    // Establecemos un timeout para la solicitud
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const response = await fetchWithRetry(url, options);
    
    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    // Procesamos la respuesta
    const responseData = await response.json();
    console.log(`Se encontraron ${responseData.length} tareas cercanas`);
    
    // Aseguramos que todas las tareas tengan la propiedad completed definida
    const tasks = responseData.map(task => ({
      ...task,
      completed: task.completed !== undefined ? task.completed : false
    }));
    
    return tasks;
  } catch (error) {
    console.error('Error al obtener tareas cercanas:', error);
    throw error;
  }
};

/**
 * Actualiza una tarea existente
 * @param {string} taskId - ID de la tarea a actualizar
 * @param {Object} taskData - Datos a actualizar (title, description, completed, etc.)
 * @returns {Promise<Object>} - Tarea actualizada
 */
export const updateTask = async (taskId, taskData) => {
  try {
    console.log(`Actualizando tarea ${taskId} con datos:`, JSON.stringify(taskData));
    
    // Obtener el token de autenticación
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    const url = `${getApiUrl()}/api/tasks/${taskId}`;
    console.log(`Enviando petición PUT a ${url}`);
    
    // Crear opciones de la petición con mayor detalle de logs
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(taskData)
    };
    
    console.log(`Configurando opciones de la petición: ${JSON.stringify({
      method: options.method,
      headers: { ...options.headers, Authorization: 'Bearer ***' }
    })}`);
    
    // Obtener configuración de la plataforma
    const config = getPlatformConfig(Platform.OS);
    console.log(`Usando configuración de red para ${Platform.OS}: timeout=${getTimeout()}ms, maxRetries=${config.config.maxRetries}`);
    
    // Realizar la petición con reintentos automáticos
    console.log(`Iniciando petición para actualizar tarea ${taskId}`);
    const response = await fetchWithRetry(url, options);
    
    // Manejar la respuesta
    if (!response.ok) {
      console.error(`Error al actualizar tarea: Status ${response.status}`);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    // Procesar la respuesta
    const updatedTask = await response.json();
    console.log(`Tarea ${taskId} actualizada correctamente:`, JSON.stringify(updatedTask).substring(0, 100) + '...');
    
    return updatedTask;
  } catch (error) {
    console.error('Error detallado al actualizar tarea:', error.message);
    console.error('Stack:', error.stack);
    
    // Registrar el error y relanzarlo para que el llamador lo maneje
    throw new Error(`Error al actualizar tarea: ${error.message}`);
  }
};

/**
 * Guarda una actividad en el sistema
 * @param {Object} activityData Datos de la actividad
 * @returns {Promise<Object>} Respuesta de la API
 */
export const saveActivity = async (activityData) => {
  try {
    console.log('Saving activity data:', JSON.stringify(activityData));
    
    // Ensure required fields are present - removed action field requirement
    if (!activityData.type || !activityData.taskId) {
      throw new Error('Activity data missing required fields: type or taskId');
    }
    
    // Valid activity types according to the backend
    const validTypes = [
      'location_enter', 'location_exit', 
      'task_complete', 'task_create', 'task_update', 'task_delete',
      'started_working', 'stopped_working'
    ];
    
    // Check if type is valid
    if (!validTypes.includes(activityData.type)) {
      throw new Error(`Invalid activity type: ${activityData.type}. Valid types: ${validTypes.join(', ')}`);
    }
    
    // If userId is not provided, get it from current user
    if (!activityData.userId) {
      try {
        const userInfo = await AsyncStorage.getItem('userInfo');
        if (userInfo) {
          const parsedUserInfo = JSON.parse(userInfo);
          activityData.userId = parsedUserInfo._id;
        }
      } catch (userError) {
        console.warn('Could not get userId from stored user info');
      }
    }
    
    // Prepare data for backend - remove action field if it exists
    const dataToSend = { ...activityData };
    if (dataToSend.action) {
      delete dataToSend.action;
    }
    
    // Obtener el token directly, no the header object
    const token = await AsyncStorage.getItem('token');
    
    const url = `${getApiUrl()}/api/activities`;
    console.log(`Sending activity data to: ${url}`);
    
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dataToSend)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      console.error(`Activity save failed with status ${response.status}:`, errorText);
      throw new Error(`Error al guardar actividad: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('Activity saved successfully:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error en saveActivity:', error);
    throw error;
  }
};

/**
 * Obtener todas las actividades de todos los usuarios (solo para administradores)
 * @param {Object} options - Opciones de paginación: { limit, page }
 * @returns {Promise<Object>} Respuesta de la API con actividades y datos de paginación
 */
export const getAdminActivities = async (options = {}) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    // Construir la URL con parámetros de paginación
    const limit = options.limit || 20;
    const page = options.page || 1;
    const url = `${API_URL}/api/activities/admin/all?limit=${limit}&page=${page}`;
    
    // Utilizar fetchWithRetry para manejar posibles problemas de conexión
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      // Si es un error 403, significa que no es administrador
      if (response.status === 403) {
        throw new Error('No tienes permisos de administrador para ver estas actividades');
      }
      throw new Error(`Error al obtener actividades: ${response.status}`);
    }
    
    // Devolver los datos con actividades y paginación
    return await response.json();
  } catch (error) {
    console.error('Error en getAdminActivities:', error);
    throw error;
  }
};

// Function to update task completion status
export const updateTaskCompletion = async (taskId, completed) => {
  try {
    console.log(`Actualizando estado de completado de tarea ${taskId} a ${completed}`);
    
    // Obtenemos el token de autenticación
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
      console.error('Error al obtener token de AsyncStorage:', storageError);
      throw new Error('No se pudo acceder al token de autenticación');
    }
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    // Establecemos un timeout para la solicitud
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ completed })
    };
    
    const response = await fetchWithRetry(`${getApiUrl()}/api/tasks/${taskId}`, options);
    
    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    // Procesamos la respuesta
    const responseData = await response.json();
    console.log('Estado de completado actualizado correctamente:', responseData);
    
    return responseData;
  } catch (error) {
    console.error('Error al actualizar estado de completado:', error);
    throw error;
  }
};

// Get task by ID
export const getTaskById = async (taskId) => {
  try {
    console.log(`Obteniendo tarea con ID: ${taskId}`);
    
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
      console.error('Error al obtener token de AsyncStorage:', storageError);
      throw new Error('No se pudo acceder al token de autenticación');
    }
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    // Establecemos un timeout para la solicitud
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    // Try the standard endpoint first, then try alternative endpoints if that fails
    let urls = [
      `${getApiUrl()}/api/tasks/${taskId}`,
      `${getApiUrl()}/api/tasks/detail/${taskId}`,
      `${getApiUrl()}/api/tasks/id/${taskId}`
    ];
    
    let lastError = null;
    
    for (const url of urls) {
      try {
        console.log(`Realizando petición a: ${url}`);
        const response = await fetchWithRetry(url, options);
        
        // Si la respuesta es exitosa, procesamos y devolvemos los datos
        if (response.ok) {
          const data = await response.json();
          console.log('Datos de tarea recibidos:', JSON.stringify(data).substring(0, 100) + '...');
          return data;
        }
        
        // Si la respuesta no es exitosa, guardamos el error pero continuamos con la siguiente URL
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      } catch (err) {
        console.error(`Error intentando obtener tarea desde ${url}:`, err);
        lastError = err;
        // Continuamos con la siguiente URL
      }
    }
    
    // Si llegamos aquí es porque ninguna URL funcionó
    throw lastError || new Error(`No se pudo obtener la tarea con ID ${taskId}`);
  } catch (error) {
    console.error(`Error al obtener tarea con ID ${taskId}:`, error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (userId) => {
  try {
    console.log(`Obteniendo usuario con ID: ${userId}`);
    
    // Ensure userId is a string (not an object)
    const userIdString = typeof userId === 'object' && userId._id ? userId._id : String(userId);
    console.log(`Usando userId normalizado: ${userIdString}`);
    
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
      console.error('Error al obtener token de AsyncStorage:', storageError);
      throw new Error('No se pudo acceder al token de autenticación');
    }
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    // Establecemos un timeout para la solicitud
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    // Try different URL patterns
    let urls = [
      `${getApiUrl()}/api/users/${userIdString}`,
      `${getApiUrl()}/api/users/detail/${userIdString}`,
      `${getApiUrl()}/api/users/id/${userIdString}`
    ];
    
    let lastError = null;
    
    for (const url of urls) {
      try {
        console.log(`Realizando petición a: ${url}`);
        const response = await fetchWithRetry(url, options);
        
        // Si la respuesta es exitosa, procesamos y devolvemos los datos
        if (response.ok) {
          const data = await response.json();
          console.log('Datos de usuario recibidos:', JSON.stringify(data).substring(0, 100) + '...');
          return data;
        }
        
        // Si la respuesta no es exitosa, guardamos el error pero continuamos con la siguiente URL
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      } catch (err) {
        console.error(`Error intentando obtener usuario desde ${url}:`, err);
        lastError = err;
        // Continuamos con la siguiente URL
      }
    }
    
    // Si llegamos aquí es porque ninguna URL funcionó
    throw lastError || new Error('Error al obtener usuario');
  } catch (error) {
    console.error(`Error al obtener usuario con ID ${userId}:`, error);
    throw error;
  }
};

// Function to get location history with task data
export const getLocationHistoryWithTasks = async (userId) => {
  try {
    let url = `${getApiUrl()}/api/locations/history-with-tasks`;
    
    // If admin is requesting a specific user's history
    if (userId) {
      url = `${getApiUrl()}/api/locations/history-with-tasks/${userId}`;
    }
    
    console.log('Obteniendo historial de ubicaciones con tareas desde:', url);
    
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
      console.error('Error al obtener token de AsyncStorage:', storageError);
      throw new Error('No se pudo acceder al token de autenticación');
    }
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    // Establecemos un timeout para la solicitud
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const response = await fetchWithRetry(url, options, 3); // Try up to 3 times
    
    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      let errorMessage = '';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || '';
      } catch (e) {
        // If response can't be parsed as JSON
        errorMessage = response.statusText || '';
      }
      throw new Error(`Error ${response.status}: ${errorMessage}`);
    }
    
    // Procesamos la respuesta
    const data = await response.json();
    console.log(`Se obtuvieron ${data.length} registros de ubicación con tareas`);
    
    return data;
  } catch (error) {
    console.error('Error al obtener historial de ubicaciones con tareas:', error);
    // If this is a 404, fall back to regular location history
    if (error.message && error.message.includes('404')) {
      console.log('Cayendo en fallback de historial simple debido a 404');
      try {
        const fallbackData = await (userId ? getUserById(userId) : getLocationHistory());
        return fallbackData.map(location => ({
          ...location,
          nearbyTasks: []
        }));
      } catch (fallbackError) {
        console.error('Error en fallback de historial:', fallbackError);
      }
    }
    throw error;
  }
};

/**
 * Get user activities for activity feed
 * @param {number} limit - Maximum number of activities to return
 * @returns {Promise<Array>} Array of user activities
 */
export const getUserActivities = async (limit = 10) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    const url = `${getApiUrl()}/api/activities/user?limit=${limit}`;
    console.log(`Fetching user activities from: ${url}`);
    
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error response from user activities:', errorData);
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.activities || !Array.isArray(data.activities)) {
      console.error('Invalid response format:', data);
      return [];
    }
    
    // Transform to expected format
    const transformedData = data.activities.map(activity => ({
      id: activity._id,
      type: activity.type.includes('task_') ? 'task' : 'location',
      action: getActionFromType(activity.type),
      title: activity.taskId?.title || activity.title || '',
      message: activity.message || '',
      timestamp: activity.createdAt || activity.timestamp || new Date().toISOString(),
      metadata: activity.metadata || {}
    }));
    
    console.log(`Retrieved ${transformedData.length} user activities`);
    return transformedData;
  } catch (error) {
    console.error('Error fetching user activities:', error);
    return [];
  }
};

// Helper function to extract action from activity type
const getActionFromType = (type) => {
  switch (type) {
    case 'task_create':
      return 'created';
    case 'task_complete':
      return 'completed';
    case 'task_update':
      return 'updated';
    case 'task_delete':
      return 'deleted';
    case 'location_enter':
      return 'entered_location';
    case 'location_exit':
      return 'exited_location';
    case 'started_working':
      return 'started_working';
    case 'stopped_working':
      return 'stopped_working';
    default:
      return 'unknown';
  }
};

export const getRealTimeLocations = async () => {
  try {
    const url = `${getApiUrl()}/api/locations/realtime`;
    const options = await createFetchOptions('GET');
    
    const response = await fetchWithRetry(url, options);
    const data = await handleResponse(response);
    
    return data.locations || [];
  } catch (error) {
    console.error('Error al obtener ubicaciones en tiempo real:', error);
    throw error;
  }
};
