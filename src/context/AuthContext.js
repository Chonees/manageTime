import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';

// Crear el contexto de autenticación
const AuthContext = createContext();

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => useContext(AuthContext);

// Proveedor del contexto de autenticación
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar si hay un token guardado al iniciar la aplicación
  useEffect(() => {
    checkAuthentication();
  }, []);

  // Función para verificar la autenticación
  const checkAuthentication = async () => {
    try {
      setLoading(true);
      const result = await api.checkToken();
      
      if (result.valid) {
        setUser(result.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Función para iniciar sesión
  const login = async (username, password) => {
    try {
      setLoading(true);
      const result = await api.login(username, password);
      setUser(result.user);
      return { success: true };
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Función para registrarse
  const register = async (username, password, email) => {
    try {
      setLoading(true);
      const result = await api.register(username, password, email);
      return { success: true };
    } catch (error) {
      console.error('Error al registrarse:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      setLoading(true);
      await api.logout();
      setUser(null);
      return { success: true };
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Valores y funciones que se proporcionarán a través del contexto
  const value = {
    user,
    loading,
    login,
    register,
    logout,
    checkAuthentication
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
