import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

// Pantallas de autenticación
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DiagnosticScreen from '../screens/DiagnosticScreen';

// Pantallas de usuario
import DashboardScreen from '../screens/DashboardScreen';
import TaskScreen from '../screens/TaskScreen';
import LocationHistoryScreen from '../screens/LocationHistoryScreen';

// Pantallas de administrador
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';

// Contexto de autenticación
import { useAuth } from '../context/AuthContext';

// Crear navegadores
const Stack = createNativeStackNavigator();

// Navegador para usuarios no autenticados
const AuthNavigator = () => (
  <Stack.Navigator 
    screenOptions={{
      headerStyle: {
        backgroundColor: '#4A90E2',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="Login" 
      component={LoginScreen} 
      options={{ title: 'Iniciar Sesión' }}
    />
    <Stack.Screen 
      name="Register" 
      component={RegisterScreen} 
      options={{ title: 'Registrarse' }}
    />
    <Stack.Screen 
      name="Diagnostic" 
      component={DiagnosticScreen} 
      options={{ title: 'Diagnóstico de Conexión' }}
    />
  </Stack.Navigator>
);

// Navegador para usuarios autenticados (no administradores)
const UserNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#4A90E2',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="Dashboard" 
      component={DashboardScreen} 
      options={{ title: 'Panel de Control' }}
    />
    <Stack.Screen 
      name="Tasks" 
      component={TaskScreen} 
      options={{ title: 'Mis Tareas' }}
    />
    <Stack.Screen 
      name="LocationHistory" 
      component={LocationHistoryScreen} 
      options={{ title: 'Historial de Ubicaciones' }}
    />
  </Stack.Navigator>
);

// Navegador para administradores
const AdminNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#2c3e50',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="AdminDashboard" 
      component={AdminDashboardScreen} 
      options={{ title: 'Panel de Administrador' }}
    />
    <Stack.Screen 
      name="UserManagement" 
      component={UserManagementScreen} 
      options={{ title: 'Gestión de Usuarios' }}
    />
    <Stack.Screen 
      name="Tasks" 
      component={TaskScreen} 
      options={{ title: 'Gestión de Tareas' }}
    />
    <Stack.Screen 
      name="LocationHistory" 
      component={LocationHistoryScreen} 
      options={{ title: 'Historial de Ubicaciones' }}
    />
  </Stack.Navigator>
);

// Navegador principal que decide qué mostrar según el estado de autenticación
const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        user.isAdmin ? <AdminNavigator /> : <UserNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
});

export default AppNavigator;
