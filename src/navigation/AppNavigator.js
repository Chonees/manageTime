import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { startLocationMonitoring, stopLocationMonitoring } from '../services/location-service';

// Pantallas de autenticación
import LoginScreen from '../screens/auth/loginScreen1/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DiagnosticScreen from '../screens/DiagnosticScreen';

// Pantallas principales
import DashboardScreen from '../screens/DashboardScreen';
import TaskScreen from '../screens/TaskScreen';
import TaskDetailsScreen from '../screens/TaskDetailsScreen';
import LocationHistoryScreen from '../screens/LocationHistoryScreen';
import VoiceAssistantScreen from '../screens/VoiceAssistantScreen';

// Pantallas de administrador
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminActivitiesScreen from '../screens/admin/AdminActivitiesScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';

// Contexto de autenticación
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// Crear navegadores
const Stack = createStackNavigator();

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
      options={{ headerShown: false }}
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
const UserNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TaskScreen" 
        component={TaskScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TaskDetails" 
        component={TaskDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="LocationHistory" 
        component={LocationHistoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="VoiceAssistant" 
        component={VoiceAssistantScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Navegador para administradores
const AdminNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="AdminDashboard" 
        component={AdminDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TaskScreen" 
        component={TaskScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TaskDetails" 
        component={TaskDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="LocationHistory" 
        component={LocationHistoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="UserManagement" 
        component={UserManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AdminActivities" 
        component={AdminActivitiesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="VoiceAssistant" 
        component={VoiceAssistantScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Navegador principal que decide qué mostrar según el estado de autenticación
const AppNavigator = () => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  // Configurar el monitoreo de ubicación basado en la autenticación
  useEffect(() => {
    const setupLocationMonitoring = async () => {
      if (user) {
        console.log('Usuario autenticado, iniciando monitoreo de ubicación');
        await startLocationMonitoring();
      } else {
        console.log('Usuario no autenticado, deteniendo monitoreo de ubicación');
        stopLocationMonitoring();
      }
    };
    
    setupLocationMonitoring();
    
    // Limpiar al desmontar
    return () => {
      stopLocationMonitoring();
    };
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  // Renderizar el navegador adecuado según si el usuario está autenticado y su rol
  return (
    <>
      {!user ? (
        <AuthNavigator />
      ) : (
        user.isAdmin ? <AdminNavigator /> : <UserNavigator />
      )}
    </>
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
