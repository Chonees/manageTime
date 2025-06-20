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
  Alert,
  Image,
  Dimensions
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import styles from './loginScreenStyles';
import LanguageToggle from '../../../components/LanguageToggle';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error, setLoading, setError } = useAuth();
  const theme = useTheme();
  const { t } = useLanguage();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('error'), t('pleaseEnterEmailAndPassword'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Iniciando sesión para usuario:', email);
      
      const normalizedEmail = email.toLowerCase();
      console.log('Usuario normalizado:', normalizedEmail);
      
      const result = await login(normalizedEmail, password);
      
      if (!result || !result.success) {
        // Convertir códigos de error a mensajes traducidos
        let errorMessage = result?.error || t('pleaseTryAgain');
        
        // Manejar los códigos de error que devuelve la API
        if (errorMessage.includes('USER_DISABLED')) {
          errorMessage = t('userDisabled') || 'Este usuario ha sido desactivado. Por favor, contacte al administrador.';
        } else if (errorMessage.includes('USER_NOT_FOUND')) {
          errorMessage = t('userNotFound') || 'Usuario no encontrado. Revise sus credenciales.';
        } else if (errorMessage.includes('INCORRECT_PASSWORD')) {
          errorMessage = t('incorrectPassword') || 'Contraseña incorrecta. Por favor, inténtelo de nuevo.';
        } else if (errorMessage.includes('CONNECTION_ERROR')) {
          errorMessage = t('connectionError') || 'Error de conexión. Verifique su conexión a internet.';
        } else if (errorMessage.includes('SERVER_ERROR')) {
          errorMessage = t('serverError') || 'Error en el servidor. Por favor, inténtelo más tarde.';
        }
        
        console.log('Login fallido:', errorMessage);
        setError(errorMessage);
        Alert.alert(t('loginError'), errorMessage);
      } else {
        console.log('Login exitoso, usuario:', result.user?.username);
      }
    } catch (error) {
      console.error('Error en login:', error);
      setError(t('anUnexpectedErrorOccurred'));
      Alert.alert(t('error'), t('anUnexpectedErrorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.languageToggleContainer}>
        <LanguageToggle />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../../../assets/Work Proof LOGO CREMA.png')} 
              style={styles.logo} 
            />
          </View>
          <Text style={styles.greeting}>{t('hello')}</Text>
          <Text style={styles.welcomeBack}>{t('welcomeBack')}</Text>
        </View>

        <View style={styles.formContainer}>
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <View style={styles.inputContainer}>
            <Text style={styles.fieldLabel}>{t('email')}</Text>
            <View style={{ position: 'relative' }}>
              <Ionicons 
                name="mail-outline" 
                size={24} 
                color="#000000" 
                style={[styles.inputIcon, { color: '#000000' }]}
              />
              <TextInput
                style={styles.input}
                placeholder={t('enterEmail')}
                placeholderTextColor={'rgba(0,0,0,0.5)'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.fieldLabel}>{t('password')}</Text>
            <View style={{ position: 'relative' }}>
              <Ionicons 
                name="lock-closed-outline" 
                size={24} 
                color="#000000" 
                style={[styles.inputIcon, { color: '#000000' }]}
              />
              <TextInput
                style={styles.input}
                placeholder={t('enterPassword')}
                placeholderTextColor={'rgba(0,0,0,0.5)'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={togglePasswordVisibility} 
                style={styles.inputIconRight}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={24} 
                  color="#000000" 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.forgotPasswordContainer}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>{t('signIn')}</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>{t('dontHaveAccount')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>{t('signUp')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
