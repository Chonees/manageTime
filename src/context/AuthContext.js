import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';
import { Platform, DeviceEventEmitter } from 'react-native';

// Crear el contexto de autenticación
const AuthContext = createContext();

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => useContext(AuthContext);

// Proveedor del contexto de autenticación
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar si hay un token guardado al iniciar la aplicación
  useEffect(() => {
    // Establecer un tiempo máximo para la verificación de autenticación
    const authTimeout = setTimeout(() => {
      if (loading) {
        console.log('Tiempo de espera agotado para la verificación de autenticación');
        setLoading(false);
        setUser(null);
      }
    }, 5000); // 5 segundos máximo de espera

    const setupAuth = async () => {
      const authResult = await checkAuthentication();
      
      // Si el usuario está autenticado, emitir evento para iniciar el rastreo
      if (authResult && authResult.success && user) {
        try {
          console.log('Usuario autenticado, emitiendo evento para iniciar rastreo');
          DeviceEventEmitter.emit('START_LOCATION_TRACKING');
        } catch (eventError) {
          console.error('Error al emitir evento de inicio de rastreo:', eventError);
        }
      }
    };
    
    setupAuth();

    return () => clearTimeout(authTimeout);
  }, []);

  // Función para verificar la autenticación
  const checkAuthentication = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Verificando autenticación...');
      const result = await api.checkToken();
      
      if (result.valid) {
        console.log('Token válido, usuario autenticado:', result.user);
        setUser(result.user);
        return { success: true, user: result.user };
      } else {
        console.log('Token inválido o no existe');
        setUser(null);
        return { success: false };
      }
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      setUser(null);
      setError('Error al verificar la autenticación');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Función para iniciar sesión
  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Intentando iniciar sesión para:', username);
      const result = await api.login(username, password);
      
      if (!result || !result.success) {
        const errorMessage = result?.error || 'Error al iniciar sesión';
        console.log('Login fallido:', errorMessage);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
      
      console.log('Login exitoso, usuario:', result.user?.username);
      setUser(result.user);
      
      // Emitir evento para iniciar el rastreo automático de ubicación
      try {
        console.log('Emitiendo evento para iniciar rastreo automático de ubicación');
        DeviceEventEmitter.emit('START_LOCATION_TRACKING');
      } catch (eventError) {
        console.error('Error al emitir evento de inicio de rastreo:', eventError);
      }
      
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Error inesperado al iniciar sesión:', error);
      const errorMessage = error.message || 'Error inesperado al iniciar sesión';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Función para registrarse
  const register = async (username, password, email) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Intentando registrar usuario:', username);
      const result = await api.register(username, password, email);
      
      console.log('Registro exitoso');
      return { success: true };
    } catch (error) {
      console.error('Error al registrarse:', error);
      setError(error.message || 'Error al registrarse');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Cerrando sesión...');
      await api.logout();
      
      // Establecer indicador de cierre de sesión para que WelcomeScreen sepa que debe saltarse
      await AsyncStorage.setItem('isLogout', 'true');
      console.log('Indicador de cierre de sesión establecido');
      
      console.log('Sesión cerrada correctamente');
      setUser(null);
      return { success: true };
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setError(error.message || 'Error al cerrar sesión');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Valores y funciones que se proporcionarán a través del contexto
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    checkAuthentication,
    setLoading,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
