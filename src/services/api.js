// API URL - Cambia esto a la URL de tu backend
// Asegúrate de que esta IP sea accesible desde tu dispositivo móvil
// Si estás usando Expo en un dispositivo físico, necesitas usar la IP de tu computadora en la red local
export const API_URL = 'http://192.168.0.148:5000/api';

// URL alternativa para usar con Expo en modo de desarrollo
// Esta URL se usa cuando se detecta que estamos en un entorno Expo
export const getApiUrl = () => {
  // Detectar si estamos en Expo
  const isExpo = typeof global.expo !== 'undefined' || 
                 typeof process.env.EXPO_PUBLIC_API_URL !== 'undefined' ||
                 typeof global.__expo !== 'undefined';
  
  if (isExpo) {
    console.log('Ejecutando en entorno Expo, usando URL alternativa');
    // En Expo, usar 10.0.2.2 para Android emulador o la IP real para dispositivos físicos
    return 'http://192.168.0.148:5000/api';
  }
  
  return API_URL;
};

import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to handle fetch errors
const handleResponse = async (response) => {
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

// Helper function to get auth header
export const getAuthHeader = async () => {
  const token = await AsyncStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Login function
export const login = async (username, password) => {
  console.log(`Intentando login con usuario: ${username}`);
  
  try {
    // Creamos una promesa para el timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Tiempo de espera agotado. El servidor no responde.'));
      }, 15000); // 15 segundos de timeout
    });
    
    // Creamos la promesa de fetch
    const fetchPromise = fetch(`${getApiUrl()}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    }).then(async (response) => {
      console.log('Respuesta recibida, status:', response.status);
      
      // Intentar leer el cuerpo de la respuesta independientemente del status
      let responseBody;
      try {
        const text = await response.text();
        console.log('Texto de respuesta:', text.substring(0, 150) + '...');
        responseBody = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error('Error al parsear respuesta JSON:', e);
        return { 
          success: false, 
          error: 'Error al procesar la respuesta del servidor'
        };
      }
      
      if (!response.ok) {
        console.log('Error en la respuesta:', responseBody);
        return { 
          success: false, 
          error: responseBody.message || `Error ${response.status}: ${response.statusText}`
        };
      }
      
      console.log('Login exitoso, usuario:', responseBody.user?.username);
      
      // Guardar token y datos de usuario
      if (responseBody.token && responseBody.user) {
        await AsyncStorage.setItem('token', responseBody.token);
        await AsyncStorage.setItem('user', JSON.stringify(responseBody.user));
        return { success: true, user: responseBody.user, token: responseBody.token };
      } else {
        console.log('Datos de respuesta incompletos:', responseBody);
        return { 
          success: false, 
          error: 'Respuesta del servidor incompleta'
        };
      }
    }).catch(error => {
      console.error('Error en la solicitud fetch:', error);
      return { 
        success: false, 
        error: error.message || 'Error de red al conectar con el servidor'
      };
    });
    
    // Competimos entre el fetch y el timeout
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error en login:', error);
    return { 
      success: false, 
      error: error.message || 'Error al iniciar sesión. Intenta nuevamente.'
    };
  }
};

// Register function
export const register = async (username, password, email) => {
  try {
    console.log('Enviando solicitud de registro a:', `${getApiUrl()}/auth/register`);
    console.log('Datos:', { username, email, password: '********' });
    
    // Establecemos un timeout para la solicitud
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout
    
    try {
      const response = await fetch(`${getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, email }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('Respuesta recibida, status:', response.status);
      
      const data = await handleResponse(response);
      console.log('Registro exitoso');
      
      return { success: true, ...data };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.log('La solicitud de registro ha excedido el tiempo de espera');
        return { 
          success: false, 
          error: 'Tiempo de espera agotado. Verifica tu conexión a internet o intenta más tarde.' 
        };
      }
      throw error;
    }
  } catch (error) {
    console.error('Error en registro:', error);
    return { 
      success: false, 
      error: error.message || 'Error al registrar usuario. Intenta nuevamente.'
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
        fetch(`${getApiUrl()}/auth/check-token`, {
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
    console.log('Enviando solicitud a:', `${getApiUrl()}/auth/check-token`);
    
    // Establecemos un timeout para la solicitud
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout
    
    try {
      const response = await fetch(`${getApiUrl()}/auth/check-token`, {
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
    const response = await fetch(`${getApiUrl()}/locations/start`, {
      method: 'POST',
      headers: await getAuthHeader(),
      body: JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude
      })
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error al iniciar trabajo:', error);
    throw error;
  }
};

// Function to end work
export const endWork = async (coords) => {
  try {
    const response = await fetch(`${getApiUrl()}/locations/end`, {
      method: 'POST',
      headers: await getAuthHeader(),
      body: JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude
      })
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
    let url = `${getApiUrl()}/locations/my-history`;
    
    // If admin is requesting a specific user's history
    if (userId) {
      url = `${getApiUrl()}/locations/user/${userId}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await getAuthHeader()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error al obtener historial de ubicaciones:', error);
    throw error;
  }
};

// Function to get all users (admin only)
export const getUsers = async () => {
  try {
    const response = await fetch(`${getApiUrl()}/users`, {
      method: 'GET',
      headers: await getAuthHeader()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    throw error;
  }
};

// Function to get current user tasks
export const getUserTasks = async () => {
  try {
    const response = await fetch(`${getApiUrl()}/tasks/my-tasks`, {
      method: 'GET',
      headers: await getAuthHeader()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    throw error;
  }
};

// Function to save a task
export const saveTask = async (task) => {
  try {
    // If task has an ID, it's an update, otherwise it's a new task
    const method = task.id ? 'PUT' : 'POST';
    const url = task.id ? `${getApiUrl()}/tasks/${task.id}` : `${getApiUrl()}/tasks`;
    
    const response = await fetch(url, {
      method,
      headers: await getAuthHeader(),
      body: JSON.stringify(task)
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error al guardar tarea:', error);
    throw error;
  }
};

// Function to get all tasks (admin)
export const getTasks = async () => {
  try {
    const response = await fetch(`${getApiUrl()}/tasks/all`, {
      method: 'GET',
      headers: await getAuthHeader()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error al obtener todas las tareas:', error);
    throw error;
  }
};

// Function to delete a task
export const deleteTask = async (taskId) => {
  try {
    const response = await fetch(`${getApiUrl()}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: await getAuthHeader()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    throw error;
  }
};

// Función para probar la conexión con el backend
export const testConnection = async () => {
  try {
    console.log('Probando conexión con:', getApiUrl());
    
    // Creamos una promesa para el timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Tiempo de espera agotado. El servidor no responde.'));
      }, 5000);
    });
    
    // Creamos la promesa de fetch
    const fetchPromise = fetch(`${getApiUrl()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(async (response) => {
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
    }).catch(error => {
      console.error('Error en la solicitud fetch:', error);
      return { 
        success: false, 
        error: error.message || 'Error de red al conectar con el servidor'
      };
    });
    
    // Competimos entre el fetch y el timeout
    return await Promise.race([fetchPromise, timeoutPromise]);
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
    
    // Creamos una promesa para el timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Tiempo de espera agotado. El servidor no responde.'));
      }, 10000);
    });
    
    // Creamos la promesa de fetch
    const fetchPromise = fetch(`${getApiUrl()}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    }).then(async (response) => {
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
    }).catch(error => {
      console.error('Error en la solicitud fetch:', error);
      return { 
        success: false, 
        error: error.message || 'Error de red al conectar con el servidor'
      };
    });
    
    // Competimos entre el fetch y el timeout
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error en testLogin:', error);
    return { 
      success: false, 
      error: error.message || 'Error al probar el login'
    };
  }
};
