import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { testConnection, testLogin, API_URL } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const DiagnosticScreen = ({ navigation }) => {
  const { strings } = useLanguage();
  const [deviceInfo, setDeviceInfo] = useState({
    platform: Platform.OS,
    version: Platform.Version,
    backendUrl: API_URL || 'No configurado'
  });
  
  const [storageInfo, setStorageInfo] = useState({
    token: 'Cargando...',
    user: 'Cargando...'
  });
  
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [loginCredentials, setLoginCredentials] = useState({
    username: 'admin@managetime.com',
    password: 'Admin123!'
  });
  
  useEffect(() => {
    loadStorageInfo();
  }, []);
  
  const loadStorageInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userJson = await AsyncStorage.getItem('user');
      
      setStorageInfo({
        token: token || strings.noResults,
        user: userJson ? JSON.parse(userJson).username : strings.noResults
      });
    } catch (error) {
      console.error('Error al cargar información de almacenamiento:', error);
      setStorageInfo({
        token: 'Error al cargar',
        user: 'Error al cargar'
      });
    }
  };
  
  const clearStorage = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      Alert.alert(strings.successAlert, strings.storageCleared);
      loadStorageInfo();
    } catch (error) {
      console.error('Error al limpiar almacenamiento:', error);
      Alert.alert(strings.errorAlert, strings.storageClearError);
    }
  };
  
  const runConnectionTest = async () => {
    setIsLoading(true);
    setTestResults([
      {
        message: strings.connectionTestStart,
        details: strings.connectingBackend,
        type: 'info'
      }
    ]);
    
    try {
      // Paso 1: Verificar que la URL del backend sea válida
      setTestResults(prev => [...prev, {
        message: strings.verifyingBackendUrl,
        details: `URL: ${API_URL}`,
        type: 'info'
      }]);
      
      // Paso 2: Probar conexión con el backend
      const result = await testConnection();
      
      if (result.success) {
        setTestResults(prev => [...prev, {
          message: strings.connectionSuccess,
          details: `Status: ${result.status} - ${result.message}`,
          type: 'success'
        }]);
      } else {
        setTestResults(prev => [...prev, {
          message: strings.connectionError,
          details: result.error,
          type: 'error'
        }]);
        
        // Sugerencias para solucionar problemas de conexión
        setTestResults(prev => [...prev, {
          message: strings.suggestions,
          details: strings.connectionSuggestions,
          type: 'info'
        }]);
      }
    } catch (error) {
      setTestResults(prev => [...prev, {
        message: strings.unexpectedError,
        details: error.message,
        type: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const runLoginTest = async () => {
    setIsLoading(true);
    setTestResults([
      {
        message: strings.loginTestStart,
        details: `${strings.user}: ${loginCredentials.username}`,
        type: 'info'
      }
    ]);
    
    try {
      // Paso 1: Verificar que la URL del backend sea válida
      setTestResults(prev => [...prev, {
        message: strings.verifyingBackendUrl,
        details: `URL: ${API_URL}/auth/login`,
        type: 'info'
      }]);
      
      // Paso 2: Probar inicio de sesión
      const result = await testLogin(loginCredentials.username, loginCredentials.password);
      
      if (result.success) {
        setTestResults(prev => [...prev, {
          message: strings.loginSuccess,
          details: `${strings.user}: ${result.user?.username || 'No disponible'}\nToken: ${result.token ? (result.token.substring(0, 15) + '...') : 'No disponible'}`,
          type: 'success'
        }]);
      } else {
        setTestResults(prev => [...prev, {
          message: strings.loginError,
          details: result.error || `Error ${result.status || 'desconocido'}`,
          type: 'error'
        }]);
        
        // Sugerencias para solucionar problemas de login
        setTestResults(prev => [...prev, {
          message: strings.suggestions,
          details: strings.loginSuggestions,
          type: 'info'
        }]);
      }
    } catch (error) {
      setTestResults(prev => [...prev, {
        message: strings.unexpectedError,
        details: error.message,
        type: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{strings.diagnosticTitle}</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{strings.deviceInfo}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{strings.platform}:</Text>
          <Text style={styles.infoValue}>{deviceInfo.platform}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{strings.version}:</Text>
          <Text style={styles.infoValue}>{deviceInfo.version}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{strings.backendUrl}:</Text>
          <Text style={styles.infoValue}>{deviceInfo.backendUrl}</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{strings.testCredentials}</Text>
        <View style={styles.inputRow}>
          <Text style={styles.infoLabel}>{strings.username}:</Text>
          <TextInput
            style={styles.input}
            value={loginCredentials.username}
            onChangeText={(text) => setLoginCredentials({...loginCredentials, username: text})}
            placeholder={strings.usernamePlaceholder}
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.infoLabel}>{strings.password}:</Text>
          <TextInput
            style={styles.input}
            value={loginCredentials.password}
            onChangeText={(text) => setLoginCredentials({...loginCredentials, password: text})}
            placeholder={strings.passwordPlaceholder}
            secureTextEntry
          />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{strings.storageInfo}:</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{strings.token}:</Text>
          <Text style={styles.infoValue}>{storageInfo.token}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{strings.user}:</Text>
          <Text style={styles.infoValue}>{storageInfo.user}</Text>
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={runConnectionTest}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{strings.testConnection}</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={runLoginTest}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{strings.testLogin}</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearStorage}
        >
          <Text style={styles.buttonText}>{strings.clearStorage}</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.resultsTitle}>{strings.results}:</Text>
      {testResults.length === 0 ? (
        <Text style={styles.noResults}>{strings.noResults}</Text>
      ) : (
        <View style={styles.resultsContainer}>
          {testResults.map((result, index) => (
            <View 
              key={index} 
              style={[
                styles.resultItem, 
                result.type === 'success' && styles.successResult,
                result.type === 'error' && styles.errorResult,
                result.type === 'info' && styles.infoResult
              ]}
            >
              <Text style={styles.resultTitle}>{result.message}</Text>
              <Text style={styles.resultDetails}>{result.details}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center'
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16
  },
  infoLabel: {
    width: 100,
    fontWeight: 'bold'
  },
  infoValue: {
    flex: 1
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  testButton: {
    backgroundColor: '#4a90e2',
    marginRight: 8
  },
  clearButton: {
    backgroundColor: '#e74c3c',
    marginLeft: 8
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  noResults: {
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
    padding: 16
  },
  resultsContainer: {
    marginBottom: 16
  },
  resultItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4
  },
  successResult: {
    backgroundColor: '#e6f7e9',
    borderLeftColor: '#2ecc71'
  },
  errorResult: {
    backgroundColor: '#fde8e8',
    borderLeftColor: '#e74c3c'
  },
  infoResult: {
    backgroundColor: '#e8f4fd',
    borderLeftColor: '#3498db'
  },
  resultTitle: {
    fontWeight: 'bold',
    marginBottom: 4
  },
  resultDetails: {
    fontSize: 14
  }
});

export default DiagnosticScreen;
