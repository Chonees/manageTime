import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, setLoading, setError } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(t('error'), t('pleaseEnter'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Iniciando sesión para usuario:', username);
      
      const normalizedUsername = username.toLowerCase();
      console.log('Usuario normalizado:', normalizedUsername);
      
      const result = await login(normalizedUsername, password);
      
      if (!result || !result.success) {
        const errorMessage = result?.error || t('tryAgain');
        console.log('Login fallido:', errorMessage);
        setError(errorMessage);
        Alert.alert(t('loginError'), errorMessage);
      } else {
        console.log('Login exitoso, usuario:', result.user?.username);
      }
    } catch (error) {
      console.error('Error en login:', error);
      setError(t('unexpectedError'));
      Alert.alert(t('error'), t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <View style={styles.languageToggleContainer}>
            <TouchableOpacity onPress={toggleLanguage} style={styles.languageToggle}>
              <Ionicons 
                name={language === 'es' ? 'language' : 'language-outline'} 
                size={24} 
                color="#4A90E2" 
              />
              <Text style={styles.languageText}>{language.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{t('login')}</Text>
          
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('username')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('username')}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('password')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('password')}
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
              <Text style={styles.loginButtonText}>{t('loginButton')}</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>{t('noAccount')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>{t('registerHere')}</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.diagnosticButton}
            onPress={() => navigation.navigate('Diagnostic')}
          >
            <Text style={styles.diagnosticText}>{t('diagnostic')}</Text>
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
  languageToggleContainer: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  languageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  languageText: {
    marginLeft: 5,
    color: '#4A90E2',
    fontWeight: 'bold',
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
