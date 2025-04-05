import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, setLoading, setError } = useAuth();
  const { strings, language, toggleLanguage, changeLanguage } = useLanguage();

  // Force a refresh of the language context when the component mounts
  useEffect(() => {
    const refreshLanguage = async () => {
      try {
        // Get the saved language from AsyncStorage
        const savedLanguage = await AsyncStorage.getItem('language');
        console.log('LoginScreen - Saved language from storage:', savedLanguage);
        
        // Make sure the language context is up-to-date
        if (savedLanguage && savedLanguage !== language) {
          console.log('LoginScreen - Force updating language to:', savedLanguage);
          changeLanguage(savedLanguage);
        }
      } catch (error) {
        console.error('LoginScreen - Error refreshing language:', error);
      }
    };
    
    refreshLanguage();
  }, []);

  // Log language changes for debugging
  useEffect(() => {
    console.log('LoginScreen - Language changed to:', language);
    console.log('LoginScreen - Available strings:', Object.keys(strings || {}).slice(0, 10));
  }, [language, strings]);

  const handleToggleLanguage = () => {
    console.log('LoginScreen - Toggle language from:', language);
    
    // Toggle the language
    toggleLanguage();
    
    // Force reload by using setTimeout to show changes immediately
    setTimeout(() => {
      console.log('LoginScreen - Language after toggle:', language);
    }, 100);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(
        strings?.errorAlert || 'Error', 
        strings?.loginFieldsRequired || 'Por favor ingresa usuario y contraseña'
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Iniciando sesión para usuario:', username);
      
      // Usar admin@managetime.com (minúscula) si el usuario ingresa admin@manageTime.com
      const normalizedUsername = username.toLowerCase();
      console.log('Usuario normalizado:', normalizedUsername);
      
      const result = await login(normalizedUsername, password);
      
      if (!result || !result.success) {
        const errorMessage = result?.error || 'No se pudo iniciar sesión. Intenta nuevamente.';
        console.log('Login fallido:', errorMessage);
        setError(errorMessage);
        Alert.alert(strings?.loginError || 'Error de inicio de sesión', errorMessage);
      } else {
        console.log('Login exitoso, usuario:', result.user?.username);
        // No es necesario navegar, el AppNavigator lo hará automáticamente
      }
    } catch (error) {
      console.error('Error en login:', error);
      setError('Ocurrió un error durante el inicio de sesión. Intenta nuevamente.');
      Alert.alert(
        strings?.errorAlert || 'Error', 
        strings?.loginGenericError || 'Ocurrió un error durante el inicio de sesión. Intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableOpacity 
        style={styles.languageButton}
        onPress={handleToggleLanguage}
      >
        <Text style={styles.languageButtonText}>
          {language === 'es' ? 'EN' : 'ES'}
        </Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>{strings?.loginTitle || 'Login'}</Text>
          
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{strings?.usernameLabel || 'Username'}</Text>
            <TextInput
              style={styles.input}
              placeholder={strings?.usernamePlaceholder || 'Enter your username'}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{strings?.passwordLabel || 'Password'}</Text>
            <TextInput
              style={styles.input}
              placeholder={strings?.passwordPlaceholder || 'Enter your password'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>{strings?.loginButton || 'Login'}</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>{strings?.noAccount || 'Don\'t have an account?'}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>{strings?.registerHere || 'Register here'}</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.diagnosticButton}
            onPress={() => navigation.navigate('Diagnostic')}
          >
            <Text style={styles.diagnosticText}>{strings?.diagnosticButton || 'Diagnose connection issues'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  languageButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#4A90E2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 10,
  },
  languageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  loginButton: {
    backgroundColor: '#4A90E2',
    height: 50,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#666',
  },
  registerLink: {
    color: '#4A90E2',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  diagnosticButton: {
    backgroundColor: '#4A90E2',
    height: 50,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  diagnosticText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
