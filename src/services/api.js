// API URL - Cambia esto a la URL de tu backend
// Asegúrate de que esta IP sea accesible desde tu dispositivo móvil
// Si estás usando Expo en un dispositivo físico, necesitas usar la IP de tu computadora en la red local
import { Platform } from 'react-native';
import { getApiBaseUrl, getFetchOptions, getTimeout } from './platform-config';
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

// Función para crear opciones de fetch con autenticación
export const createFetchOptions = async (method, body = null, customHeaders = {}) => {
  try {
    // Obtener opciones base según la plataforma
    const baseOptions = getFetchOptions();
    
    // Obtener headers de autenticación
    const authHeaders = await getAuthHeader();
    
    // Crear opciones de fetch
    const options = {
      ...baseOptions,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...customHeaders
      }
    };
    
    // Añadir body si es necesario
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    return options;
  } catch (error) {
    console.error('Error al crear opciones de fetch:', error);
    // Devolver opciones básicas en caso de error
    return {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    };
  }
};

// Login function
export const login = async (username, password) => {
  console.log(`Intentando login con usuario: ${username}`);
  
  try {
    // Creamos una promesa para el timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Tiempo de espera agotado. El servidor no responde.'));
      }, getTimeout()); // Timeout según la plataforma
    });
    
    // Creamos la promesa de fetch con opciones básicas (sin usar createFetchOptions)
    const fetchPromise = fetch(`${getApiUrl()}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    // Esperamos a que se resuelva la primera promesa (fetch o timeout)
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    // Procesamos la respuesta
    const data = await response.json();
    console.log('Login exitoso, guardando token y datos de usuario');
    
    // Si hay token, lo guardamos en AsyncStorage
    if (data.token) {
      try {
        await AsyncStorage.setItem('token', data.token);
        console.log('Token guardado correctamente');
        
        // Si hay datos de usuario, los guardamos en AsyncStorage
        if (data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
          console.log('Datos de usuario guardados correctamente');
        }
      } catch (storageError) {
        console.error('Error al guardar en AsyncStorage:', storageError);
        // Continuamos a pesar del error para devolver los datos al usuario
      }
    }
    
    return {
      success: true,
      user: data.user,
      token: data.token
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
    
    const response = await fetch(`${getApiUrl()}/api/locations/start`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
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
    console.log('API endWork - Enviando coordenadas:', coords);
    
    if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
      throw new Error('Coordenadas inválidas');
    }
    
    // Asegurarnos de que las coordenadas sean strings para evitar problemas de serialización
    const payload = {
      latitude: String(coords.latitude),
      longitude: String(coords.longitude)
    };
    
    console.log('API endWork - Payload final:', payload);
    
    const headers = await getAuthHeader();
    headers['Content-Type'] = 'application/json';
    
    const response = await fetch(`${getApiUrl()}/api/locations/end`, {
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout());
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      console.log(`Se obtuvieron ${data.length} registros de ubicación`);
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al obtener historial de ubicaciones');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error al obtener historial de ubicaciones:', error);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout());
    
    try {
      const response = await fetch(`${getApiUrl()}/api/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      console.log(`Se obtuvieron ${data.length} usuarios`);
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al obtener usuarios');
      }
      throw error;
    }
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout());
    
    try {
      const response = await fetch(`${getApiUrl()}/api/tasks/my-tasks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      console.log(`Se obtuvieron ${data.length} tareas del usuario`);
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al obtener tareas del usuario');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    throw error;
  }
};

// Function to save a task
export const saveTask = async (task) => {
  try {
    console.log('Guardando tarea:', JSON.stringify(task));
    
    // If task has an ID, it's an update, otherwise it's a new task
    const method = task._id ? 'PUT' : 'POST';
    const url = task._id ? `${getApiUrl()}/api/tasks/${task._id}` : `${getApiUrl()}/api/tasks`;
    
    // Asegurarnos de que si hay userId, se envíe correctamente
    if (task.userId) {
      console.log(`La tarea será asignada al usuario con ID: ${task.userId}`);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout());
    
    try {
      // Preparar los datos a enviar - aseguramos que userId sea un string
      const taskData = { 
        ...task,
        userId: task.userId ? task.userId.toString() : undefined
      };
      
      console.log('Enviando datos al servidor:', JSON.stringify(taskData));
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskData),
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
      console.log('Tarea guardada correctamente:', data);
      
      // Aseguramos que la tarea tenga la propiedad completed
      if (data) {
        // Formateamos la respuesta para que sea consistente
        return {
          task: {
            ...data,
            completed: data.completed !== undefined ? data.completed : false
          }
        };
      }
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al guardar la tarea');
      }
      throw error;
    }
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout());
    
    try {
      const response = await fetch(`${getApiUrl()}/api/tasks/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      console.log(`Se obtuvieron ${data.length} tareas`);
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al obtener tareas');
      }
      throw error;
    }
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout());
    
    try {
      const response = await fetch(`${getApiUrl()}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      console.log('Tarea eliminada correctamente');
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al eliminar la tarea');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    throw error;
  }
};

// Function to start work
export const testConnection = async () => {
  try {
    console.log('Probando conexión con:', getApiUrl());
    
    // Creamos una promesa para el timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Tiempo de espera agotado. El servidor no responde.'));
      }, getTimeout()); // Timeout según la plataforma
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
      }, getTimeout()); // Timeout según la plataforma
    });
    
    // Creamos la promesa de fetch
    const fetchPromise = fetch(`${getApiUrl()}/api/auth/login`, {
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout());
    
    try {
      // Asegurarnos de que el userId sea un string
      const data = { 
        ...taskData,
        userId: taskData.userId.toString()
      };
      
      console.log('Enviando datos al servidor para asignar tarea:', JSON.stringify(data));
      
      const response = await fetch(`${getApiUrl()}/api/tasks/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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
          completed: responseData.completed !== undefined ? responseData.completed : false
        }
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al asignar la tarea');
      }
      throw error;
    }
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout());
    
    try {
      const response = await fetch(`${getApiUrl()}/api/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al obtener estadísticas');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    throw error;
  }
};

// Function to get recent activity
export const getRecentActivity = async () => {
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout());
    
    try {
      const response = await fetch(`${getApiUrl()}/api/stats/recent-activity`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al obtener actividad reciente');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error al obtener actividad reciente:', error);
    throw error;
  }
};
