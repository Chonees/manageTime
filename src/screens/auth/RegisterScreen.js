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
  Dimensions,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import LanguageToggle from '../../components/LanguageToggle';

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, loading, error, setError } = useAuth();
  const theme = useTheme();
  const { t } = useLanguage();

  const handleRegister = async () => {
    // Validaciones básicas
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert(t('error'), t('pleaseEnterEmailAndPassword'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('error'), 'Las contraseñas no coinciden');
      return;
    }

    // Validación simple de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(t('error'), 'Por favor ingresa un email válido');
      return;
    }

    try {
      setError(null);
      console.log('Iniciando registro de usuario:', username);
      const result = await register(username, password, email);
      
      if (result.success) {
        console.log('Registro completado con éxito');
        Alert.alert(
          'Registro Exitoso', 
          'Tu cuenta ha sido creada correctamente. Ahora puedes iniciar sesión.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        console.log('Registro fallido:', result.error);
        setError(result.error || 'No se pudo completar el registro. Intenta nuevamente.');
        Alert.alert(t('error'), result.error || 'No se pudo completar el registro. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error en registro:', error);
      setError(error.message || 'Ocurrió un error durante el registro. Intenta nuevamente.');
      Alert.alert(t('error'), error.message || 'Ocurrió un error durante el registro. Intenta nuevamente.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#2e2e2e" barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.backButtonContainer}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff3e5" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.languageToggleContainer}>
          <LanguageToggle />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../../assets/Work Proof LOGO CREMA.png')} 
                style={styles.logo} 
              />
            </View>
            <Text style={styles.greeting}>{t('hello')}</Text>
            <Text style={styles.welcomeBack}>{t('signUp')}</Text>
          </View>

          <View style={styles.formContainer}>
            {error && <Text style={styles.errorText}>{error}</Text>}
            
            <View style={styles.inputContainer}>
              <Text style={styles.fieldLabel}>{t('username')}</Text>
              <View style={{ position: 'relative' }}>
                <Ionicons 
                  name="person-outline" 
                  size={24} 
                  color="#000000" 
                  style={[styles.inputIcon, { color: '#000000' }]}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('enterUsername')}
                  placeholderTextColor={'rgba(0,0,0,0.5)'}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            </View>
            
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
                  keyboardType="email-address"
                  autoCapitalize="none"
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
            
            <View style={styles.inputContainer}>
              <Text style={styles.fieldLabel}>{t('confirmPassword')}</Text>
              <View style={{ position: 'relative' }}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={24} 
                  color="#000000" 
                  style={[styles.inputIcon, { color: '#000000' }]}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('confirmPassword')}
                  placeholderTextColor={'rgba(0,0,0,0.5)'}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity 
                  onPress={toggleConfirmPasswordVisibility} 
                  style={styles.inputIconRight}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                    size={24} 
                    color="#000000" 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>{t('signUp')}</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.orContainer}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>{t('or')}</Text>
              <View style={styles.orLine} />
            </View>
            
            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity style={styles.googleButton}>
                <Ionicons name="logo-google" size={24} color="#fff" style={styles.googleIcon} />
                <Text style={styles.googleText}>Google</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t('dontHaveAccount')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>{t('signIn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2e2e2e',
  },
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e',
  },
  backButtonContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backButton: {
    padding: 5,
  },
  languageToggleContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 20,
    paddingTop: 60,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: -90,
  },
  logo: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
  greeting: {
    fontSize: 45,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 5,
  },
  welcomeBack: {
    fontSize: 20,
    color: '#ffffff',
    marginBottom: 20,
    opacity: 0.8,
  },
  formContainer: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 20,
    width: '100%',
  },
  fieldLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 5,
    opacity: 0.7,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#fff3e5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingLeft: 40, // Espacio para el icono
    backgroundColor: '#fff3e5', // Color crema sólido
    color: '#000000', // Texto negro
    marginBottom: 5,
    fontSize: 16,
  },
  inputIcon: {
    position: 'absolute',
    left: 10,
    top: 13,
    zIndex: 10,
  },
  inputIconRight: {
    position: 'absolute',
    right: 10,
    top: 13,
    zIndex: 10,
  },
  registerButton: {
    backgroundColor: '#1c1c1c',
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ffffff40',
  },
  orText: {
    color: '#ffffff',
    paddingHorizontal: 10,
    fontSize: 14,
    opacity: 0.7,
  },
  socialButtonsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 15,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ffffff40',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleText: {
    color: '#ffffff',
    fontSize: 14,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#ffffff',
    opacity: 0.7,
    fontSize: 14,
  },
  loginLink: {
    color: '#fff3e5',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  errorText: {
    color: '#ff5252',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
  },
});

export default RegisterScreen;
