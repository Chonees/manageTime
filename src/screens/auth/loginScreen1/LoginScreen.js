import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import styles from './loginScreenStyles';

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
          <Text style={styles.appTitle}>Work Proof</Text>
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

export default LoginScreen;
