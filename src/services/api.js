// URL base de la API
const API_URL = 'http://localhost:5000/api';

// Importar datos simulados para desarrollo
import { mockUsers, mockLocationHistory, mockTasks } from '../utils/mockData';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Función auxiliar para simular retraso de red
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función auxiliar para manejar errores de fetch
const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    const error = (data && data.message) || response.statusText;
    throw new Error(error);
  }
  
  return data;
};

// Función para iniciar sesión
export const login = async (username, password) => {
  // Simulación de API para desarrollo
  await delay(1000); // Simular retraso de red
  
  const user = mockUsers.find(u => u.username === username);
  
  if (!user) {
    throw new Error('Usuario no encontrado');
  }
  
  // En un entorno real, la contraseña se verificaría en el servidor
  // Aquí simplemente simulamos que cualquier contraseña funciona para desarrollo
  
  // Asegurarse de que la propiedad isAdmin esté definida correctamente
  const userToSave = {
    ...user,
    isAdmin: user.isAdmin === true // Asegurarse de que sea un booleano explícito
  };
  
  // Guardar token simulado
  await AsyncStorage.setItem('token', 'fake-jwt-token');
  await AsyncStorage.setItem('user', JSON.stringify(userToSave));
  
  console.log('Usuario logueado:', userToSave);
  
  return { user: userToSave };
};

// Función para registrar un nuevo usuario
export const register = async (username, password, email) => {
  // Simulación de API para desarrollo
  await delay(1000); // Simular retraso de red
  
  const existingUser = mockUsers.find(u => u.username === username || u.email === email);
  
  if (existingUser) {
    throw new Error('El nombre de usuario o email ya está en uso');
  }
  
  // En un entorno real, el usuario se guardaría en la base de datos
  const newUser = {
    id: (mockUsers.length + 1).toString(),
    username,
    email,
    isAdmin: false,
    isActive: true,
    createdAt: new Date().toISOString()
  };
  
  // Añadir a la lista simulada (solo para desarrollo)
  mockUsers.push(newUser);
  
  return { success: true, message: 'Usuario registrado correctamente' };
};

// Función para cerrar sesión
export const logout = async () => {
  // Simulación de API para desarrollo
  await delay(500); // Simular retraso de red
  
  // Eliminar token simulado
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
  
  return { success: true };
};

// Función para verificar si el token es válido
export const checkToken = async () => {
  // Simulación de API para desarrollo
  await delay(500); // Simular retraso de red
  
  const token = await AsyncStorage.getItem('token');
  
  if (!token) {
    return { valid: false };
  }
  
  // En un entorno real, se verificaría el token en el servidor
  // Aquí recuperamos el usuario guardado en AsyncStorage
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      // Asegurarse de que la propiedad isAdmin esté definida correctamente
      if (user.isAdmin === undefined) {
        user.isAdmin = false; // Por defecto, un usuario no es administrador
      }
      return { valid: true, user };
    }
    
    // Si no hay usuario guardado, consideramos que no hay sesión válida
    return { valid: false };
  } catch (error) {
    console.error('Error al recuperar usuario:', error);
    return { valid: false };
  }
};

// Función para iniciar trabajo
export const startWork = async (coords) => {
  // Simulación de API para desarrollo
  await delay(1000); // Simular retraso de red
  
  // Obtener el ID del usuario actual
  let userId = '1';
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      userId = user.id;
    }
  } catch (error) {
    console.error('Error al obtener usuario para registro de trabajo:', error);
  }
  
  // En un entorno real, se guardaría en la base de datos
  const newLocationEntry = {
    id: (mockLocationHistory.length + 1).toString(),
    userId: userId,
    type: 'start',
    latitude: coords.latitude,
    longitude: coords.longitude,
    timestamp: new Date().toISOString()
  };
  
  // Añadir a la lista simulada (solo para desarrollo)
  mockLocationHistory.push(newLocationEntry);
  
  return { success: true, message: 'Trabajo iniciado correctamente' };
};

// Función para finalizar trabajo
export const endWork = async (coords) => {
  // Simulación de API para desarrollo
  await delay(1000); // Simular retraso de red
  
  // Obtener el ID del usuario actual
  let userId = '1';
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      userId = user.id;
    }
  } catch (error) {
    console.error('Error al obtener usuario para registro de trabajo:', error);
  }
  
  // En un entorno real, se guardaría en la base de datos
  const newLocationEntry = {
    id: (mockLocationHistory.length + 1).toString(),
    userId: userId,
    type: 'end',
    latitude: coords.latitude,
    longitude: coords.longitude,
    timestamp: new Date().toISOString()
  };
  
  // Añadir a la lista simulada (solo para desarrollo)
  mockLocationHistory.push(newLocationEntry);
  
  return { success: true, message: 'Trabajo finalizado correctamente' };
};

// Función para obtener historial de ubicaciones
export const getLocationHistory = async (userId) => {
  // Simulación de API para desarrollo
  await delay(1000); // Simular retraso de red
  
  // Si no se proporciona userId, obtener el del usuario actual
  if (!userId) {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        userId = user.id;
      }
    } catch (error) {
      console.error('Error al obtener usuario para historial:', error);
    }
  }
  
  let history = [...mockLocationHistory];
  
  if (userId) {
    history = history.filter(entry => entry.userId === userId);
  }
  
  return history;
};

// Función para obtener todos los usuarios (solo admin)
export const getUsers = async () => {
  // Simulación de API para desarrollo
  await delay(1000); // Simular retraso de red
  
  return [...mockUsers];
};

// Función para obtener tareas del usuario actual
export const getUserTasks = async () => {
  // Simulación de API para desarrollo
  await delay(800); // Simular retraso de red
  
  // Obtener el ID del usuario actual
  let userId = null;
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      userId = user.id;
    }
  } catch (error) {
    console.error('Error al obtener usuario para tareas:', error);
  }
  
  if (!userId) {
    return [];
  }
  
  // Filtrar tareas por usuario
  return mockTasks.filter(task => task.userId === userId);
};

// Función para guardar una tarea
export const saveTask = async (task) => {
  // Simulación de API para desarrollo
  await delay(800); // Simular retraso de red
  
  // Obtener el ID del usuario actual
  let userId = '1';
  let isAdmin = false;
  
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      userId = user.id;
      isAdmin = user.isAdmin === true;
    }
  } catch (error) {
    console.error('Error al obtener usuario para crear tarea:', error);
  }
  
  // Si es administrador y se especificó un userId en la tarea, usar ese
  // De lo contrario, usar el ID del usuario actual
  const assignedUserId = (isAdmin && task.userId) ? task.userId : userId;
  
  const newTask = {
    id: (mockTasks.length + 1).toString(),
    title: task.title,
    description: task.description || '',
    completed: false,
    userId: assignedUserId,
    createdAt: new Date().toISOString()
  };
  
  // Añadir a la lista simulada (solo para desarrollo)
  mockTasks.push(newTask);
  
  return { success: true, task: newTask };
};

// Función para obtener todas las tareas (admin)
export const getTasks = async () => {
  // Simulación de API para desarrollo
  await delay(800); // Simular retraso de red
  
  return [...mockTasks];
};

// Función para eliminar una tarea
export const deleteTask = async (taskId) => {
  // Simulación de API para desarrollo
  await delay(500); // Simular retraso de red
  
  const index = mockTasks.findIndex(task => task.id === taskId);
  
  if (index !== -1) {
    mockTasks.splice(index, 1);
    return { success: true };
  } else {
    throw new Error('Tarea no encontrada');
  }
};
