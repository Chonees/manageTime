import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import LanguageToggle from '../../components/LanguageToggle';

const { width, height } = Dimensions.get('window');

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

        <View style={styles.mainContainer}>
          <View style={styles.headerContainer}>
            <Image 
              source={require('../../../assets/Work Proof LOGO CREMA.png')} 
              style={styles.logo} 
            />
            <Text style={styles.welcomeBack}>{t('signUp')}</Text>
          </View>

          <View style={styles.formContainer}>
            {error && <Text style={styles.errorText}>{error}</Text>}
            
            <View style={styles.inputContainer}>
              <Text style={styles.fieldLabel}>{t('username')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color="#000000" 
                  style={styles.inputIcon}
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
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="mail-outline" 
                  size={20} 
                  color="#000000" 
                  style={styles.inputIcon}
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
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color="#000000" 
                  style={styles.inputIcon}
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
                    size={20} 
                    color="#000000" 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.fieldLabel}>{t('confirmPassword')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color="#000000" 
                  style={styles.inputIcon}
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
                    size={20} 
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
            
            <View style={styles.footerContainer}>
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>{t('dontHaveAccount')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLink}>{t('signIn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
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
    top: Platform.OS === 'ios' ? 20 : 30,
    left: 20,
    zIndex: 10,
  },
  backButton: {
    padding: 5,
  },
  languageToggleContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 30,
    right: 20,
    zIndex: 10,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 80,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: height * 0.01,
    position: 'relative',
  },
  logo: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
  welcomeBack: {
    fontSize: Math.min(width * 0.07, 30),
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: -70,
    marginBottom: height * 0.02,
    opacity: 0.9,
    position: 'relative',
    zIndex: 1,
  },
  formContainer: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 5,
    opacity: 0.7,
  },
  inputContainer: {
    marginBottom: height * 0.02,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: height * 0.055,
    borderWidth: 1,
    borderColor: '#fff3e5',
    borderRadius: 12,
    backgroundColor: '#fff3e5',
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputIconRight: {
    position: 'absolute',
    right: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#000000',
    fontSize: Math.min(width * 0.04, 16),
  },
  registerButton: {
    backgroundColor: '#1c1c1c',
    height: height * 0.06,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: height * 0.02,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: 'bold',
  },
  footerContainer: {
    marginTop: height * 0.03,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    color: '#ffffff',
    opacity: 0.7,
    fontSize: Math.min(width * 0.035, 14),
  },
  loginLink: {
    color: '#fff3e5',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: Math.min(width * 0.035, 14),
  },
  errorText: {
    color: '#ff5252',
    marginBottom: height * 0.015,
    textAlign: 'center',
    fontSize: Math.min(width * 0.035, 14),
  },
});

export default RegisterScreen;
