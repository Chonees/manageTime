import React, { useEffect, useState, useContext, useRef } from 'react';
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
import { LanguageContext } from '../context/LanguageContext';

// Crear navegadores
const Stack = createNativeStackNavigator();

// Helper function to create a key for screen options to force re-render
const createLanguageKey = (language, screenName) => `${screenName}_${language}_${Date.now()}`;

// Navegador para usuarios no autenticados
const AuthNavigator = () => {
  const { strings, language, isInitialized } = useContext(LanguageContext);
  const navigationKey = useRef(`auth_${Date.now()}`);
  
  // Debug
  console.log('AuthNavigator render - Current language:', language);
  console.log('AuthNavigator - loginTitle:', strings?.loginTitle);
  
  // Force navigator to update when language changes
  useEffect(() => {
    if (isInitialized) {
      console.log('AuthNavigator - Language changed to:', language);
      navigationKey.current = `auth_${language}_${Date.now()}`;
    }
  }, [language, isInitialized]);
  
  return (
    <Stack.Navigator 
      key={navigationKey.current}
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
        options={{ 
          title: strings?.loginTitle || 'Login',
          // Force header update when language changes
          key: createLanguageKey(language, 'Login'),
        }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen} 
        options={{ 
          title: strings?.registerTitle || 'Register',
          key: createLanguageKey(language, 'Register'),
        }}
      />
      <Stack.Screen 
        name="Diagnostic" 
        component={DiagnosticScreen} 
        options={{ 
          title: strings?.diagnosticTitle || 'Connection Diagnostics',
          key: createLanguageKey(language, 'Diagnostic'),
        }}
      />
    </Stack.Navigator>
  );
};

// Navegador para usuarios autenticados (no administradores)
const UserNavigator = () => {
  const { strings, language, isInitialized } = useContext(LanguageContext);
  const navigationKey = useRef(`user_${Date.now()}`);
  
  // Debug 
  console.log('UserNavigator render - Current language:', language);
  console.log('UserNavigator - locationHistoryTitle:', strings?.locationHistoryTitle);
  
  // Force navigator to update when language changes
  useEffect(() => {
    if (isInitialized) {
      console.log('UserNavigator - Language changed to:', language);
      navigationKey.current = `user_${language}_${Date.now()}`;
    }
  }, [language, isInitialized]);
  
  return (
    <Stack.Navigator
      key={navigationKey.current}
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
        options={{ 
          title: strings?.dashboard || 'Dashboard',
          key: createLanguageKey(language, 'Dashboard'),
        }}
      />
      <Stack.Screen 
        name="Tasks" 
        component={TaskScreen} 
        options={{ 
          title: strings?.manageTasks || 'My Tasks',
          key: createLanguageKey(language, 'Tasks'),
        }}
      />
      <Stack.Screen 
        name="LocationHistory" 
        component={LocationHistoryScreen} 
        options={{ 
          title: strings?.locationHistoryTitle || 'Location History',
          key: createLanguageKey(language, 'LocationHistory'),
        }}
      />
    </Stack.Navigator>
  );
};

// Navegador para administradores
const AdminNavigator = () => {
  const { strings, language, isInitialized } = useContext(LanguageContext);
  const navigationKey = useRef(`admin_${Date.now()}`);
  
  // Debug
  console.log('AdminNavigator render - Current language:', language);
  console.log('AdminNavigator - locationHistoryTitle:', strings?.locationHistoryTitle);
  
  // Force navigator to update when language changes
  useEffect(() => {
    if (isInitialized) {
      console.log('AdminNavigator - Language changed to:', language);
      navigationKey.current = `admin_${language}_${Date.now()}`;
    }
  }, [language, isInitialized]);
  
  return (
    <Stack.Navigator
      key={navigationKey.current}
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
        options={{ 
          title: strings?.adminPanel || 'Admin Dashboard',
          key: createLanguageKey(language, 'AdminDashboard'),
        }}
      />
      <Stack.Screen 
        name="UserManagement" 
        component={UserManagementScreen} 
        options={{ 
          title: strings?.userManagementTitle || 'User Management',
          key: createLanguageKey(language, 'UserManagement'),
        }}
      />
      <Stack.Screen 
        name="Tasks" 
        component={TaskScreen} 
        options={{ 
          title: strings?.manageTasks || 'Manage Tasks',
          key: createLanguageKey(language, 'Tasks'),
        }}
      />
      <Stack.Screen 
        name="LocationHistory" 
        component={LocationHistoryScreen} 
        options={{ 
          title: strings?.locationHistoryTitle || 'Location History',
          key: createLanguageKey(language, 'LocationHistory'),
        }}
      />
    </Stack.Navigator>
  );
};

// Navegador principal que decide qué mostrar según el estado de autenticación
const AppNavigator = () => {
  const { user, loading } = useAuth();
  const { language, isInitialized } = useContext(LanguageContext);
  const navigationKey = useRef(`root_${Date.now()}`);
  
  console.log('AppNavigator render - Current language:', language);
  
  // Force navigator to update when language changes
  useEffect(() => {
    if (isInitialized) {
      console.log('AppNavigator - Language changed to:', language);
      navigationKey.current = `root_${language}_${Date.now()}`;
    }
  }, [language, isInitialized]);

  if (loading || !isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer key={navigationKey.current}>
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
