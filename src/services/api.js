// API URL - Cambia esto a la URL de tu backend
// Asegúrate de que esta IP sea accesible desde tu dispositivo móvil
// Si estás usando Expo en un dispositivo físico, necesitas usar la IP de tu computadora en la red local
import { Platform } from 'react-native';
import { getApiBaseUrl, getFetchOptions, getTimeout, getPlatformConfig } from './platform-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications } from './notification-service';

export const API_URL = getApiBaseUrl();

// URL alternativa para usar con Expo en modo de desarrollo
// Esta URL se usa cuando se detecta que estamos en un entorno Expo
export const getApiUrl = () => {
  // Usar la configuración específica para cada plataforma
  return getApiBaseUrl();
};

// Helper function to handle fetch errors
export const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }
  
  return await response.json().catch(() => ({}));
};

// Función simplificada para realizar peticiones sin reintentos
export const fetchWithRetry = async (url, options, maxRetries = null) => {
  try {
    // Crear un nuevo AbortController
    const controller = new AbortController();
    
    // Establecer un timeout
    const timeout = getTimeout();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
    
    // Combinar las opciones pasadas con la señal del AbortController
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };
    
    // Realizar la petición sin reintentos
    const response = await fetch(url, fetchOptions);
    
    // Limpiar el timeout si la petición se completó
    clearTimeout(timeoutId);
    
    return response;
  } catch (error) {
    throw error;
  }
};

// Helper function to get auth header
export const getAuthHeader = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  } catch (error) {
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
    
    return options;
  } catch (error) {
    throw error;
  }
};

// Login function
export const login = async (username, password) => {
  try {
    const url = `${getApiUrl()}/api/auth/login`;
    
    // Crear opciones específicas para el login
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ username, password })
    };
    
    // Usar la función directa para el login (más confiable)
    const loginResult = await new Promise((resolve, reject) => {
      // Usar XMLHttpRequest que puede ser más estable en algunos dispositivos Android
      const xhr = new XMLHttpRequest();
      
      // Establecer un timeout largo para el login
      const timeout = setTimeout(() => {
        xhr.abort();
        reject(new Error('Tiempo de espera agotado en login'));
      }, 120000); // 2 minutos
      
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          clearTimeout(timeout);
          
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
        reject(new Error('Error de red en login'));
      };
      
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send(JSON.stringify({ username, password }));
    });
    
    // Si hay token, lo guardamos en AsyncStorage
    if (loginResult.token) {
      try {
        await AsyncStorage.setItem('token', loginResult.token);
        
        // Si hay datos de usuario, los guardamos en AsyncStorage
        if (loginResult.user) {
          await AsyncStorage.setItem('user', JSON.stringify(loginResult.user));
        }
      } catch (storageError) {
        // Continuamos a pesar del error para devolver los datos al usuario
      }
    }
    
    return {
      success: true,
      user: loginResult.user,
      token: loginResult.token
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Error desconocido en el inicio de sesión'
    };
  }
};

// Register function
export const register = async (username, password, email) => {
  try {
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
    
    if (!token) {
      return { valid: false };
    }
    
    // Primero intentamos obtener el usuario del almacenamiento local
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        
        // Intentamos verificar el token en segundo plano, pero no esperamos la respuesta
        // Esto evita que la aplicación se quede cargando si hay problemas de red
        fetch(`${getApiUrl()}/api/auth/check-token`, {
          method: 'GET',
          headers: await getAuthHeader()
        }).then(async (response) => {
          if (!response.ok) {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
          }
        }).catch(e => {
          // Manejo silencioso de errores
        });
        
        // Retornamos inmediatamente con los datos del usuario
        return { valid: true, user };
      }
    } catch (e) {
      // Manejo silencioso de errores
    }
    
    // Si no tenemos datos del usuario en el almacenamiento, intentamos obtenerlos del servidor
    
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
      
      if (!response.ok) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        return { valid: false };
      }
      
      const data = await response.json();
      
      // Guardar datos del usuario
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        // Asumimos que el token es válido temporalmente
        return { valid: true, user: { username: 'Usuario' }, offline: true };
      }
      throw error;
    }
  } catch (error) {
    // Si hay un error, intentamos usar los datos del usuario almacenados localmente
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        return { valid: true, user, offline: true };
      }
    } catch (e) {
      // Manejo silencioso de errores
    }
    
    return { valid: false, error: error.message };
  }
};

// Logout function
export const logout = async () => {
  try {
    // Obtener el token antes de eliminarlo
    const token = await AsyncStorage.getItem('token');
    
    if (token) {
      // Notificar al backend para actualizar el estado del usuario a inactivo
      try {
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        };
        
        // Llamar al endpoint de logout
        await fetchWithRetry(`${getApiUrl()}/api/auth/logout`, options);
      } catch (logoutError) {
        // Continuamos con el logout local incluso si falla la notificación al servidor
      }
    }
    
    // Remove token and user data from local storage
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// Function to start work
export const startWork = async (coords) => {
  try {
    if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
      throw new Error('Coordenadas inválidas');
    }
    
    // Asegurarnos de que las coordenadas sean strings para evitar problemas de serialización
    const payload = {
      latitude: String(coords.latitude),
      longitude: String(coords.longitude)
    };
    
    const headers = await getAuthHeader();
    headers['Content-Type'] = 'application/json';
    
    const response = await fetchWithRetry(`${getApiUrl()}/api/locations/start`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    return await handleResponse(response);
  } catch (error) {
    throw error;
  }
};

// Function to end work
export const endWork = async (coords) => {
  try {
    if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
      throw new Error('Coordenadas inválidas');
    }
    
    // Asegurarnos de que las coordenadas sean strings para evitar problemas de serialización
    const payload = {
      latitude: String(coords.latitude),
      longitude: String(coords.longitude)
    };
    
    const headers = await getAuthHeader();
    headers['Content-Type'] = 'application/json';
    
    const response = await fetchWithRetry(`${getApiUrl()}/api/locations/end`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    return await handleResponse(response);
  } catch (error) {
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
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

// Function to get all users (admin only)
export const getUsers = async () => {
  try {
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
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
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Function to get current user tasks
export const getUserTasks = async () => {
  try {
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
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
    
    return data;
  } catch (error) {
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
    throw error;
  }
};

// Function to get all tasks (admin)
export const getTasks = async () => {
  try {
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
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
    
    const response = await fetchWithRetry(`${getApiUrl()}/api/tasks`, options);
    
    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    // Procesamos la respuesta
    const data = await response.json();
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Function to delete a task
export const deleteTask = async (taskId) => {
  try {
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
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
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Función para probar directamente la conexión con el backend sin usar fetchWithRetry
export const directConnectionTest = async () => {
  try {
    // Crear una promesa que se resolverá con el resultado de la petición
    return new Promise((resolve, reject) => {
      // Establecer un timeout largo para esta prueba
      const timeout = setTimeout(() => {
        reject(new Error('Timeout en prueba directa después de 2 minutos'));
      }, 120000); // 2 minutos
      
      // Usar XMLHttpRequest que puede ser más estable en algunos dispositivos Android
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          clearTimeout(timeout);
          
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
        reject(new Error('Error de red en conexión directa'));
      };
      
      xhr.open('GET', getApiUrl(), true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send();
    });
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Error desconocido en prueba de conexión directa'
    };
  }
};

// Function to test connection
export const testConnection = async () => {
  try {
    // Primero intentar con XMLHttpRequest directo
    try {
      const directResult = await directConnectionTest();
      return directResult;
    } catch (directError) {
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
    
    // Intentar leer el cuerpo de la respuesta
    let responseBody;
    try {
      const text = await response.text();
      responseBody = text ? JSON.parse(text) : {};
    } catch (e) {
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
    return { 
      success: false, 
      error: error.message || 'Error al probar la conexión'
    };
  }
};

// Función para probar el inicio de sesión
export const testLogin = async (username, password) => {
  try {
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
    
    // Intentar leer el cuerpo de la respuesta
    let responseBody;
    try {
      const text = await response.text();
      responseBody = text ? JSON.parse(text) : {};
    } catch (e) {
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
    return { 
      success: false, 
      error: error.message || 'Error al probar el login'
    };
  }
};

// Function to assign a task to another user (admin only)
export const assignTask = async (taskData) => {
  try {
    if (!taskData.userId) {
      throw new Error('Se requiere el ID del usuario para asignar la tarea');
    }
    
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
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
    throw error;
  }
};

// Function to get recent activities
export const getRecentActivities = async () => {
  try {
    const url = `${getApiUrl()}/api/stats/recent-activity`;
    const options = await createFetchOptions('GET');
    
    const response = await fetchWithRetry(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }
    
    // Transform the data to match the expected format
    const transformedData = data.map(activity => ({
      id: activity.id || activity._id,
      type: activity.type,
      action: getActionFromType(activity.type),
      username: activity.username,
      title: activity.title,
      message: activity.message,
      timestamp: activity.timestamp,
      metadata: activity.metadata || {}
    }));
    
    return transformedData;
  } catch (error) {
    throw error;
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
    
    // Aseguramos que todas las tareas tengan la propiedad completed definida
    const tasks = responseData.map(task => ({
      ...task,
      completed: task.completed !== undefined ? task.completed : false
    }));
    
    return tasks;
  } catch (error) {
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
    // Obtener el token de autenticación
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    const url = `${getApiUrl()}/api/tasks/${taskId}`;
    
    // Crear opciones de la petición con mayor detalle de logs
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(taskData)
    };
    
    // Realizar la petición con reintentos automáticos
    const response = await fetchWithRetry(url, options);
    
    // Manejar la respuesta
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    // Procesar la respuesta
    const updatedTask = await response.json();
    
    return updatedTask;
  } catch (error) {
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
    // Validate required fields
    if (!activityData.type) {
      throw new Error('Activity data missing required fields: type');
    }
    
    // Create a copy of the data to send
    const dataToSend = { ...activityData };
    
    // Mapear los tipos a los que el backend realmente reconoce
    // La validación demuestra que started_working/stopped_working no son válidos
    if (dataToSend.type === 'clock_in' || dataToSend.type === 'started_working') {
      dataToSend.type = 'task_activity';
      if (!dataToSend.metadata) dataToSend.metadata = {};
      dataToSend.metadata.availability = 'available';
    } else if (dataToSend.type === 'clock_out' || dataToSend.type === 'stopped_working') {
      dataToSend.type = 'task_activity';
      if (!dataToSend.metadata) dataToSend.metadata = {};
      dataToSend.metadata.availability = 'unavailable';
    }
    
    // Check if this is an availability activity
    const isAvailabilityActivity = 
      dataToSend.type === 'task_activity' && 
      dataToSend.metadata && 
      dataToSend.metadata.availability && 
      (dataToSend.metadata.availability === 'available' || 
       dataToSend.metadata.availability === 'unavailable');
    
    // Para actividades que no son de disponibilidad ni de eliminación de tareas, taskId es requerido
    if (dataToSend.type !== 'task_delete' && 
        !isAvailabilityActivity && 
        !dataToSend.taskId) {
      throw new Error('Activity data missing required field: taskId');
    }
    
    // Valid activity types according to the backend
    const validTypes = [
      'task_create', 'task_update', 'task_complete', 'task_delete',
      'task_assign', 'location_enter', 'location_exit',
      'task_activity'
    ];
    
    if (!validTypes.includes(dataToSend.type)) {
      throw new Error(`Invalid activity type: ${dataToSend.type}. Valid types: ${validTypes.join(', ')}`);
    }
    
    // If userId is not provided, try to get it from AsyncStorage
    if (!dataToSend.userId) {
      try {
        const userInfoString = await AsyncStorage.getItem('userInfo');
        if (userInfoString) {
          const parsedUserInfo = JSON.parse(userInfoString);
          dataToSend.userId = parsedUserInfo._id;
          dataToSend.username = parsedUserInfo.name || parsedUserInfo.username || 'User';
        }
      } catch (storageError) {
        // Manejo silencioso de errores
      }
    }
    
    // Ensure metadata exists
    if (!dataToSend.metadata) {
      dataToSend.metadata = {};
    }
    
    // Si es una actividad de disponibilidad, asegurarse de que el taskId sea null
    if (isAvailabilityActivity) {
      delete dataToSend.taskId;
    }
    
    // Special handling for task_delete
    if (dataToSend.type === 'task_delete' && activityData.taskId) {
      if (!dataToSend.metadata) {
        dataToSend.metadata = {};
      }
      dataToSend.metadata.deletedTaskId = activityData.taskId;
    }
    
    // Get API URL and token
    const url = `${getApiUrl()}/api/activities`;
    const token = await AsyncStorage.getItem('token');
    
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dataToSend)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    const responseData = await response.json();
    
    // Send notification to admin users
    try {
      // Get the push token
      const pushToken = await registerForPushNotifications();
      if (pushToken) {
        // Send to server for push notification
        const notificationUrl = `${getApiUrl()}/api/notifications/admin/activity`;
        await fetchWithRetry(notificationUrl, {
          method: 'POST',
          headers: {
            ...await getAuthHeader(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            activityId: responseData._id || responseData.id,
            title: getActivityTitle(activityData.type),
            body: `${activityData.username || 'User'}: ${getActivityMessage(activityData)}`,
            type: activityData.type,
            pushToken
          })
        });
        console.log('Activity sent to server for push notification');
      } else {
        console.log('No push token available for notification');
      }
    } catch (notifError) {
      // Manejo silencioso de errores
    }
    
    return responseData;
  } catch (error) {
    // Special case for task_delete
    if (activityData && activityData.type === 'task_delete') {
      return { success: true, activitySaved: false, message: 'Tarea eliminada pero no se pudo registrar la actividad' };
    }
    
    throw error;
  }
};

// Helper function to get activity title based on type
const getActivityTitle = (type) => {
  const titles = {
    'task_create': 'Task Created',
    'task_update': 'Task Updated',
    'task_complete': 'Task Completed',
    'task_delete': 'Task Deleted',
    'task_assign': 'Task Assigned',
    'location_enter': 'Location Entered',
    'location_exit': 'Location Exited',
    'started_working': 'Started Working',
    'stopped_working': 'Stopped Working',
    'task_activity': 'Task Activity'
  };
  
  return titles[type] || 'Activity';
};

// Helper function to get activity message
const getActivityMessage = (activityData) => {
  if (activityData.message) {
    return activityData.message;
  }
  
  const messages = {
    'task_create': 'created a new task',
    'task_update': 'updated a task',
    'task_complete': 'completed a task',
    'task_delete': 'deleted a task',
    'task_assign': 'assigned a task',
    'location_enter': 'entered task location',
    'location_exit': 'exited task location',
    'started_working': 'started working on a task',
    'stopped_working': 'stopped working on a task',
    'task_activity': 'performed an activity on a task'
  };
  
  return messages[activityData.type] || 'performed an action';
};

// Obtener ubicaciones en tiempo real de todos los usuarios (solo administradores)
// @returns {Promise<Array>} Lista de usuarios con sus ubicaciones actuales
export const getRealTimeLocations = async () => {
  try {
    // Obtener el token directamente del AsyncStorage
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('No se proporcionó token de autenticación');
    }
    
    // Usar getApiUrl para mantener centralizada la URL base
    const url = `${getApiUrl()}/api/users/active-locations`;
    
    // Crear opciones con el token de autorización
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const response = await fetchWithRetry(url, options);
    const data = await handleResponse(response);
    return data.locations || [];
  } catch (error) {
    throw error;
  }
};

// Function to update task completion status
export const updateTaskCompletion = async (taskId, completed) => {
  try {
    // Obtenemos el token de autenticación
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
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
    
    return responseData;
  } catch (error) {
    throw error;
  }
};

// Get task by ID
export const getTaskById = async (taskId) => {
  try {
    // Try to get from local cache first
    try {
      const cachedTasksString = await AsyncStorage.getItem('cachedTasks');
      if (cachedTasksString) {
        const cachedTasks = JSON.parse(cachedTasksString);
        const cachedTask = cachedTasks.find(task => task._id === taskId);
        if (cachedTask) {
          return cachedTask;
        }
      }
    } catch (cacheError) {
      // Manejo silencioso de errores
    }
    
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
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
        const response = await fetchWithRetry(url, options);
        
        // Si la respuesta es exitosa, procesamos y devolvemos los datos
        if (response.ok) {
          const data = await response.json();
          
          // Cache the task for future use
          try {
            const cachedTasksString = await AsyncStorage.getItem('cachedTasks');
            const cachedTasks = cachedTasksString ? JSON.parse(cachedTasksString) : [];
            
            // Remove old version of this task if it exists
            const filteredTasks = cachedTasks.filter(task => task._id !== taskId);
            
            // Add the new task data
            filteredTasks.push(data);
            
            // Store back in AsyncStorage (limit to 50 tasks to avoid storage issues)
            await AsyncStorage.setItem('cachedTasks', JSON.stringify(filteredTasks.slice(-50)));
          } catch (cacheError) {
            // Manejo silencioso de errores
          }
          
          return data;
        }
        
        // Si la respuesta no es exitosa, guardamos el error pero continuamos con la siguiente URL
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      } catch (err) {
        lastError = err;
        // Continuamos con la siguiente URL
      }
    }
    
    // If we reach here, try to get from user's tasks as a last resort
    try {
      const userTasks = await getUserTasks();
      const foundTask = userTasks.find(task => task._id === taskId);
      if (foundTask) {
        // Cache this task for future use
        try {
          const cachedTasksString = await AsyncStorage.getItem('cachedTasks');
          const cachedTasks = cachedTasksString ? JSON.parse(cachedTasksString) : [];
          
          // Remove old version of this task if it exists
          const filteredTasks = cachedTasks.filter(task => task._id !== taskId);
          
          // Add the found task data
          filteredTasks.push(foundTask);
          
          // Store back in AsyncStorage
          await AsyncStorage.setItem('cachedTasks', JSON.stringify(filteredTasks.slice(-50)));
        } catch (cacheError) {
          // Manejo silencioso de errores
        }
        
        return foundTask;
      }
    } catch (userTasksError) {
      // Manejo silencioso de errores
    }
    
    // Si llegamos aquí es porque ninguna URL funcionó
    throw lastError || new Error(`No se pudo obtener la tarea con ID ${taskId}`);
  } catch (error) {
    if (error.message.includes('401')) {
      try {
        const tokenlessOptions = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        const response = await fetchWithRetry(`${getApiUrl()}/api/tasks/${taskId}`, tokenlessOptions);
        if (response.ok) {
          const data = await response.json();
          return data;
        } else {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      } catch (tokenlessError) {
        throw error;
      }
    } else {
      throw error;
    }
  }
};

/**
 * Get user by ID
 * @param {string} userId - ID of the user
 * @returns {Promise<Object>} User data
 */
export const getUserById = async (userId) => {
  try {
    // Ensure userId is a string (not an object)
    const userIdString = typeof userId === 'object' ? userId._id : String(userId);
    
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
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
        const response = await fetchWithRetry(url, options);
        
        // Si la respuesta es exitosa, procesamos y devolvemos los datos
        if (response.ok) {
          const data = await response.json();
          return data;
        }
        
        // Si la respuesta no es exitosa, guardamos el error pero continuamos con la siguiente URL
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      } catch (err) {
        lastError = err;
        // Continuamos con la siguiente URL
      }
    }
    
    // Si llegamos aquí es porque ninguna URL funcionó
    throw lastError || new Error('Error al obtener usuario');
  } catch (error) {
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
    
    // Obtenemos el token de autenticación directamente
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
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
    
    return data;
  } catch (error) {
    // If this is a 404, fall back to regular location history
    if (error.message && error.message.includes('404')) {
      try {
        const fallbackData = await (userId ? getUserById(userId) : getLocationHistory());
        return fallbackData.map(location => ({
          ...location,
          nearbyTasks: []
        }));
      } catch (fallbackError) {
        throw error;
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
    
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.activities || !Array.isArray(data.activities)) {
      throw new Error('Invalid response format');
    }
    
    // Transform the data to match the expected format
    const transformedData = data.activities.map(activity => ({
      id: activity._id,
      type: activity.type.includes('task_') ? 'task' : 'location',
      action: getActionFromType(activity.type),
      title: activity.taskId?.title || activity.title || '',
      message: activity.message || '',
      timestamp: activity.createdAt || activity.timestamp || new Date().toISOString(),
      metadata: activity.metadata || {}
    }));
    
    return transformedData;
  } catch (error) {
    throw error;
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

/**
 * Obtener actividades de una tarea específica
 * @param {string} taskId - ID de la tarea
 * @returns {Promise<Array>} Lista de actividades de la tarea
 */
export const getTaskActivities = async (taskId) => {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader || !authHeader.Authorization) {
      throw new Error('No se proporcionó token de autenticación');
    }

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader
      }
    };
    
    const url = `${getApiUrl()}/api/activities/task/${taskId}`;
    
    const response = await fetchWithRetry(url, options);
    const data = await handleResponse(response);
    
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene la tarea activa actual con modo manos libres
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} - Tarea activa o null si no hay ninguna
 */
export const getActiveTask = async (token) => {
  try {
    const apiUrl = `${getApiUrl()}/api/tasks/active`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const statusCode = response.status;
    
    if (!response.ok) {
      const errorBody = await response.text();
      if (statusCode === 404) {
        return null;
      }
      
      throw new Error(`Error ${statusCode}: ${errorBody}`);
    }

    const data = await response.json();
    
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * Añade una nota de voz a una tarea
 * @param {Object} noteData - Datos de la nota (taskId, text, type)
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const addTaskNote = async (noteData, token) => {
  try {
    const response = await fetch(`${getApiUrl()}/api/tasks/note`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(noteData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al guardar la nota');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Activa el modo manos libres para una tarea específica
 * @param {string} taskId - ID de la tarea
 * @returns {Promise<Object>} - Tarea actualizada
 */
export const enableHandsFreeMode = async (taskId) => {
  try {
    const options = await createFetchOptions('PUT', {
      handsFreeMode: true,
      status: 'in-progress'
    });
    
    const response = await fetchWithRetry(`${getApiUrl()}/api/tasks/${taskId}`, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al activar modo manos libres');
    }
    
    const updatedTask = await response.json();
    
    return updatedTask;
  } catch (error) {
    throw error;
  }
};

/**
 * Añade una nota de voz a una tarea - versión directa simplificada
 * @param {Object} noteData - Datos de la nota (taskId, text)
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const addSimpleVoiceNote = async (taskId, text, token) => {
  try {
    // Construir una URL más directa
    const url = `${getApiUrl()}/api/tasks/${taskId}/note`;
    
    // Configurar las opciones de la petición directamente
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        text, 
        type: 'voice_note',
        timestamp: new Date().toISOString()
      })
    };
    
    // Realizar petición sin usar fetchWithRetry para tener control directo
    const response = await fetch(url, options);
    
    // Manejar los errores manualmente
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al guardar nota de voz: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Guardar múltiples ubicaciones de seguimiento en el backend
 * @param {Array} locations - Array de objetos de ubicación con {latitude, longitude, timestamp, type}
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const saveLocations = async (locations) => {
  try {
    if (!Array.isArray(locations) || locations.length === 0) {
      throw new Error('Se requiere un array de ubicaciones para guardar');
    }
    
    // Crear opciones de la petición
    const options = await createFetchOptions('POST', { locations });
    
    // Endpoint para guardar ubicaciones
    const url = `${getApiUrl()}/api/locations/batch`;
    
    const response = await fetchWithRetry(url, options);
    
    // Manejar la respuesta
    const result = await handleResponse(response);
    
    return result;
  } catch (error) {
    throw error;
  }
};


// Obtener el estado de disponibilidad de todos los usuarios
// @returns {Promise<Array>} Lista de usuarios con su estado de disponibilidad
export const getUserAvailabilityStatus = async () => {
  try {
    // Obtener todas las actividades recientes con un límite mayor para capturar más historial
    const activitiesResponse = await getAdminActivities({ 
      limit: 300,   // Aumentamos el límite para asegurar capturar todas las actividades relevantes
      sort: '-createdAt' // Ordenar por fecha descendente (más recientes primero)
    });
    
    // Extraer el array de actividades
    const activities = activitiesResponse?.activities || [];
    
    if (!Array.isArray(activities)) {
      throw new Error('Invalid response format');
    }
    
    // Imprimir actividades para debugging
    console.log(`Total de actividades obtenidas: ${activities.length}`);
    
    // Vamos a inspeccionar en detalle las actividades para depurar
    console.log('Actividades por tipo:');
    const typeCount = {};
    activities.forEach(activity => {
      if (!activity || !activity.type) return;
      
      if (!typeCount[activity.type]) {
        typeCount[activity.type] = 0;
      }
      typeCount[activity.type]++;
      
      // Verificar si es una actividad task_activity con metadatos de disponibilidad
      if (activity.type === 'task_activity' && activity.metadata && activity.metadata.availability) {
        console.log(`Encontrada actividad de disponibilidad: ${JSON.stringify({
          type: activity.type,
          userId: activity.userId,
          username: activity.username,
          availability: activity.metadata.availability,
          timestamp: activity.createdAt
        })}`);
      }
    });
    
    // Mostrar conteo por tipo
    Object.keys(typeCount).forEach(type => {
      console.log(`- ${type}: ${typeCount[type]} actividades`);
    });
    
    // Map para almacenar el estado más reciente de cada usuario
    const userStatusMap = new Map();
    
    // Recorrer todas las actividades y encontrar las más recientes de disponibilidad para cada usuario
    for (const activity of activities) {
      if (!activity || !activity.type) continue;
      
      // Verificar si es una actividad relacionada con disponibilidad
      let isAvailabilityActivity = false;
      let isAvailable = false;
      
      // Caso principal: task_activity con metadata de disponibilidad
      if (activity.type === 'task_activity' && activity.metadata && activity.metadata.availability) {
        isAvailabilityActivity = true;
        isAvailable = activity.metadata.availability === 'available';
        console.log(`Actividad de disponibilidad encontrada - userId: ${activity.userId}, tipo: ${activity.type}, disponible: ${isAvailable}`);
      }
      
      // Ignorar actividades que no son de disponibilidad
      if (!isAvailabilityActivity) continue;
      
      // Extraer información del usuario y normalizar ID
      const userId = typeof activity.userId === 'object' ? activity.userId._id : activity.userId;
      if (!userId) continue;
      
      const username = activity.userId?.username || activity.username || activity.metadata?.username || 'Usuario';
      
      // Generar timestamp normalizado
      const timestamp = activity.createdAt || activity.timestamp || new Date().toISOString();
      const activityDate = new Date(timestamp);
      
      // Solo actualizar si es la actividad más reciente para este usuario
      const existingStatus = userStatusMap.get(userId);
      if (!existingStatus || activityDate > new Date(existingStatus.timestamp)) {
        console.log(`Actualizando estado de ${username} (${userId}): ${isAvailable ? 'DISPONIBLE' : 'NO DISPONIBLE'} - ${timestamp}`);
        userStatusMap.set(userId, {
          userId,
          username,
          isAvailable,
          timestamp
        });
      }
    }
    
    // Convertir el Map a un array de objetos para la respuesta
    const result = Array.from(userStatusMap.values());
    
    console.log(`Resultado final: ${result.length} usuarios con estado de disponibilidad`);
    result.forEach(user => {
      console.log(`- ${user.username} (${user.userId}): ${user.isAvailable ? 'DISPONIBLE' : 'NO DISPONIBLE'}`);
    });
    
    return result;
  } catch (error) {
    console.error('Error al obtener estado de disponibilidad:', error);
    throw error;
  }
};

// Function to get admin activities with pagination
// @param {Object} options - Options for query (page, limit, sort)
// @returns {Promise<Object>} - List of activities and pagination info
export const getAdminActivities = async (options = {}) => {
  try {
    // Asegurarnos de que options es un objeto
    const params = options || {};
    
    // Extraer opciones o usar valores predeterminados
    const page = params.page || 1;
    const limit = params.limit || 100;
    const sort = params.sort || '-createdAt'; // Por defecto ordenar por fecha de creación descendente
    
    // Obtenemos el token de autenticación
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (storageError) {
      throw new Error('No se pudo acceder al token de autenticación');
    }
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    // Construir URL con parámetros de query
    const queryParams = new URLSearchParams({
      page,
      limit,
      sort
    }).toString();
    
    const url = `${getApiUrl()}/api/activities?${queryParams}`;
    
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const response = await fetchWithRetry(url, fetchOptions);
    const data = await handleResponse(response);
    
    // Asegurar que la respuesta tenga la estructura esperada por AdminActivityList
    const result = {
      activities: data.activities || data.data || data.results || [],
      pagination: data.pagination || {
        currentPage: page,
        pages: Math.ceil((data.total || 0) / limit),
        total: data.total || 0
      }
    };
    
    return result;
  } catch (error) {
    throw error;
  }
};
