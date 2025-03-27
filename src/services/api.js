// API Base URL
const API_URL = 'http://localhost:5000/api';

// Import mock data for development
import { mockUsers, mockLocationHistory, mockTasks } from '../utils/mockData';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to simulate network delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to handle fetch errors
const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    const error = (data && data.message) || response.statusText;
    throw new Error(error);
  }
  
  return data;
};

// Login function
export const login = async (username, password) => {
  // Simulate API delay for development
  await delay(1000); // Simulate network delay
  
  const user = mockUsers.find(u => u.username === username);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // In a real environment, the password would be verified on the server
  // Here we simply simulate that any password works for development
  
  // Ensure the isAdmin property is correctly defined
  const userToSave = {
    ...user,
    isAdmin: user.isAdmin === true // Ensure it's an explicit boolean
  };
  
  // Save simulated token
  await AsyncStorage.setItem('token', 'fake-jwt-token');
  await AsyncStorage.setItem('user', JSON.stringify(userToSave));
  
  console.log('User logged in:', userToSave);
  
  return { user: userToSave };
};

// Logout function
export const logout = async () => {
  // Simulate API delay for development
  await delay(500); // Simulate network delay
  
  // Remove simulated token
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
  
  return { success: true };
};

// Function to verify if token is valid
export const checkToken = async () => {
  // Simulate API delay for development
  await delay(500); // Simulate network delay
  
  const token = await AsyncStorage.getItem('token');
  
  if (!token) {
    return { valid: false };
  }
  
  // In a real environment, the token would be verified on the server
  // Here we retrieve the user saved in AsyncStorage
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      // Ensure the isAdmin property is correctly defined
      if (user.isAdmin === undefined) {
        user.isAdmin = false; // By default, a user is not an admin
      }
      return { valid: true, user };
    }
    
    // If no user is saved, consider there's no valid session
    return { valid: false };
  } catch (error) {
    console.error('Error retrieving user:', error);
    return { valid: false };
  }
};

// Function to start work
export const startWork = async (coords) => {
  // Simulate API delay for development
  await delay(1000); // Simulate network delay
  
  // Get the ID of the current user
  let userId = '1';
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      userId = user.id;
    }
  } catch (error) {
    console.error('Error getting user for work log:', error);
  }
  
  // In a real environment, this would be saved in the database
  const newLocationEntry = {
    id: (mockLocationHistory.length + 1).toString(),
    userId: userId,
    type: 'start',
    latitude: coords.latitude,
    longitude: coords.longitude,
    timestamp: new Date().toISOString()
  };
  
  // Add to simulated list (only for development)
  mockLocationHistory.push(newLocationEntry);
  
  return { success: true, message: 'Work started successfully' };
};

// Function to end work
export const endWork = async (coords) => {
  // Simulate API delay for development
  await delay(1000); // Simulate network delay
  
  // Get the ID of the current user
  let userId = '1';
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      userId = user.id;
    }
  } catch (error) {
    console.error('Error getting user for work log:', error);
  }
  
  // In a real environment, this would be saved in the database
  const newLocationEntry = {
    id: (mockLocationHistory.length + 1).toString(),
    userId: userId,
    type: 'end',
    latitude: coords.latitude,
    longitude: coords.longitude,
    timestamp: new Date().toISOString()
  };
  
  // Add to simulated list (only for development)
  mockLocationHistory.push(newLocationEntry);
  
  return { success: true, message: 'Work ended successfully' };
};

// Function to get location history
export const getLocationHistory = async (userId) => {
  // Simulate API delay for development
  await delay(1000); // Simulate network delay
  
  // If no userId is provided, get the current user's ID
  if (!userId) {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        userId = user.id;
      }
    } catch (error) {
      console.error('Error getting user for history:', error);
    }
  }
  
  let history = [...mockLocationHistory];
  
  if (userId) {
    history = history.filter(entry => entry.userId === userId);
  }
  
  return history;
};

// Function to get all users (admin only)
export const getUsers = async () => {
  // Simulate API delay for development
  await delay(1000); // Simulate network delay
  
  return [...mockUsers];
};

// Function to get current user tasks
export const getUserTasks = async () => {
  // Simulate API delay for development
  await delay(800); // Simulate network delay
  
  // Get the ID of the current user
  let userId = null;
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      userId = user.id;
    }
  } catch (error) {
    console.error('Error getting user for tasks:', error);
  }
  
  if (!userId) {
    return [];
  }
  
  // Filter tasks by user
  return mockTasks.filter(task => task.userId === userId);
};

// Function to save a task
export const saveTask = async (task) => {
  // Simulate API delay for development
  await delay(800); // Simulate network delay
  
  // Get the ID of the current user
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
    console.error('Error getting user for creating task:', error);
  }
  
  // If admin and a userId is specified in the task, use that
  // Otherwise, use the current user's ID
  const assignedUserId = (isAdmin && task.userId) ? task.userId : userId;
  
  const newTask = {
    id: (mockTasks.length + 1).toString(),
    title: task.title,
    description: task.description || '',
    completed: false,
    userId: assignedUserId,
    createdAt: new Date().toISOString()
  };
  
  // Add to simulated list (only for development)
  mockTasks.push(newTask);
  
  return { success: true, task: newTask };
};

// Function to get all tasks (admin)
export const getTasks = async () => {
  // Simulate API delay for development
  await delay(800); // Simulate network delay
  
  return [...mockTasks];
};

// Function to delete a task
export const deleteTask = async (taskId) => {
  // Simulate API delay for development
  await delay(500); // Simulate network delay
  
  const index = mockTasks.findIndex(task => task.id === taskId);
  
  if (index !== -1) {
    mockTasks.splice(index, 1);
    return { success: true };
  } else {
    throw new Error('Task not found');
  }
};
