import React, { useState, useEffect } from 'react';
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
  
  // Estados de validación
  const [usernameValid, setUsernameValid] = useState(null);
  const [emailValid, setEmailValid] = useState(null);
  const [passwordValid, setPasswordValid] = useState(null);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUpperCase: false,
    hasNumber: false
  });
  const [passwordsMatch, setPasswordsMatch] = useState(null);
  const [usernameExists, setUsernameExists] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  
  const { register, loading, error, setError, checkUserExists, checkEmailExists } = useAuth();
  const theme = useTheme();
  const { t, language } = useLanguage();

  // Validación de email con regex más completo
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Validación de contraseña: mínimo 8 caracteres, al menos una mayúscula y un número
  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    return {
      isValid: minLength && hasUpperCase && hasNumber,
      minLength,
      hasUpperCase,
      hasNumber
    };
  };

  // Validar username en tiempo real
  useEffect(() => {
    if (username.trim() === '') {
      setUsernameValid(null);
      setUsernameExists(false);
    } else {
      setUsernameValid(username.trim().length >= 3);
      
      // Verificar si el usuario ya existe
      const checkUsername = async () => {
        if (username.trim().length >= 3) {
          try {
            const exists = await checkUserExists(username);
            setUsernameExists(exists);
          } catch (error) {
            console.error('Error al verificar usuario:', error);
          }
        }
      };
      
      // Debounce para no hacer demasiadas peticiones
      const timeoutId = setTimeout(checkUsername, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [username]);

  // Validar email en tiempo real
  useEffect(() => {
    if (email.trim() === '') {
      setEmailValid(null);
      setEmailExists(false);
    } else {
      setEmailValid(validateEmail(email));
      
      // Verificar si el email ya existe
      const checkEmail = async () => {
        if (validateEmail(email)) {
          try {
            const exists = await checkEmailExists(email);
            setEmailExists(exists);
          } catch (error) {
            console.error('Error al verificar email:', error);
          }
        }
      };
      
      // Debounce para no hacer demasiadas peticiones
      const timeoutId = setTimeout(checkEmail, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [email]);

  // Validar contraseña en tiempo real
  useEffect(() => {
    if (password === '') {
      setPasswordValid(null);
      setPasswordValidation({
        minLength: false,
        hasUpperCase: false,
        hasNumber: false
      });
    } else {
      const validation = validatePassword(password);
      setPasswordValid(validation.isValid);
      setPasswordValidation({
        minLength: validation.minLength,
        hasUpperCase: validation.hasUpperCase,
        hasNumber: validation.hasNumber
      });
    }
  }, [password]);

  // Validar coincidencia de contraseñas en tiempo real
  useEffect(() => {
    if (confirmPassword === '' || password === '') {
      setPasswordsMatch(null);
    } else {
      setPasswordsMatch(password === confirmPassword);
    }
  }, [password, confirmPassword]);

  const getPasswordErrorMessage = (validationResult) => {
    if (language === 'es') {
      let errors = [];
      if (!validationResult.minLength) errors.push('al menos 8 caracteres');
      if (!validationResult.hasUpperCase) errors.push('al menos una letra mayúscula');
      if (!validationResult.hasNumber) errors.push('al menos un número');
      
      return `La contraseña debe contener ${errors.join(', ')}.`;
    } else {
      let errors = [];
      if (!validationResult.minLength) errors.push('at least 8 characters');
      if (!validationResult.hasUpperCase) errors.push('at least one uppercase letter');
      if (!validationResult.hasNumber) errors.push('at least one number');
      
      return `Password must contain ${errors.join(', ')}.`;
    }
  };

  const handleRegister = async () => {
    // Limpiar error previo
    setError(null);
    
    // Validaciones básicas
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      const errorMessage = language === 'es' 
        ? 'Por favor completa todos los campos'
        : 'Please fill in all fields';
      Alert.alert(t('error'), errorMessage);
      return;
    }

    // Validación de nombre de usuario (mínimo 3 caracteres)
    if (!usernameValid) {
      const errorMessage = language === 'es'
        ? 'El nombre de usuario debe tener al menos 3 caracteres'
        : 'Username must be at least 3 characters long';
      Alert.alert(t('error'), errorMessage);
      return;
    }
    
    // Validación de usuario existente
    if (usernameExists) {
      const errorMessage = language === 'es'
        ? 'Este nombre de usuario ya está en uso'
        : 'This username is already taken';
      Alert.alert(t('error'), errorMessage);
      return;
    }

    // Validación de email
    if (!emailValid) {
      const errorMessage = language === 'es'
        ? 'Por favor ingresa un correo electrónico válido'
        : 'Please enter a valid email address';
      Alert.alert(t('error'), errorMessage);
      return;
    }
    
    // Validación de email existente
    if (emailExists) {
      const errorMessage = language === 'es'
        ? 'Este correo electrónico ya está registrado'
        : 'This email is already registered';
      Alert.alert(t('error'), errorMessage);
      return;
    }

    // Validación de contraseña
    if (!passwordValid) {
      Alert.alert(t('error'), getPasswordErrorMessage(passwordValidation));
      return;
    }

    // Validación de coincidencia de contraseñas
    if (!passwordsMatch) {
      const errorMessage = language === 'es'
        ? 'Las contraseñas no coinciden'
        : 'Passwords do not match';
      Alert.alert(t('error'), errorMessage);
      return;
    }

    try {
      console.log('Iniciando registro de usuario:', username);
      const result = await register(username, password, email);
      
      if (result.success) {
        console.log('Registro completado con éxito');
        const successTitle = language === 'es' ? 'Registro Exitoso' : 'Registration Successful';
        const successMessage = language === 'es' 
          ? 'Tu cuenta ha sido creada correctamente. Ahora puedes iniciar sesión.'
          : 'Your account has been successfully created. You can now log in.';
        Alert.alert(
          successTitle, 
          successMessage,
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        console.log('Registro fallido:', result.error);
        setError(result.error || (language === 'es' 
          ? 'No se pudo completar el registro. Intenta nuevamente.'
          : 'Registration could not be completed. Please try again.'));
        Alert.alert(t('error'), result.error || (language === 'es' 
          ? 'No se pudo completar el registro. Intenta nuevamente.'
          : 'Registration could not be completed. Please try again.'));
      }
    } catch (error) {
      console.error('Error en registro:', error);
      const errorMessage = language === 'es'
        ? 'Ocurrió un error durante el registro. Intenta nuevamente.'
        : 'An error occurred during registration. Please try again.';
      setError(error.message || errorMessage);
      Alert.alert(t('error'), error.message || errorMessage);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Renderizar iconos de validación
  const renderValidationIcon = (isValid) => {
    if (isValid === null) return null;
    
    return (
      <Ionicons 
        name={isValid ? "checkmark-circle" : "close-circle"} 
        size={20} 
        color={isValid ? "#999999" : "#666666"} 
        style={styles.validationIcon}
      />
    );
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
              <View style={[
                styles.inputWrapper,
                (usernameValid === false || usernameExists) && styles.inputError
              ]}>
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
                {renderValidationIcon(usernameValid && !usernameExists)}
              </View>
              {usernameValid === false && (
                <Text style={styles.errorHint}>
                  {language === 'es' 
                    ? 'Mínimo 3 caracteres'
                    : 'Minimum 3 characters'}
                </Text>
              )}
              {usernameExists && (
                <Text style={styles.errorHint}>
                  {language === 'es' 
                    ? 'Este nombre de usuario ya está en uso'
                    : 'This username is already taken'}
                </Text>
              )}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.fieldLabel}>{t('email')}</Text>
              <View style={[
                styles.inputWrapper,
                (emailValid === false || emailExists) && styles.inputError
              ]}>
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
                {renderValidationIcon(emailValid && !emailExists)}
              </View>
              {emailValid === false && (
                <Text style={styles.errorHint}>
                  {language === 'es' 
                    ? 'Formato de correo inválido'
                    : 'Invalid email format'}
                </Text>
              )}
              {emailExists && (
                <Text style={styles.errorHint}>
                  {language === 'es' 
                    ? 'Este correo electrónico ya está registrado'
                    : 'This email is already registered'}
                </Text>
              )}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.fieldLabel}>{t('password')}</Text>
              <View style={[
                styles.inputWrapper,
                passwordValid === false && styles.inputError
              ]}>
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
                {renderValidationIcon(passwordValid)}
              </View>
              <View style={styles.passwordRequirements}>
                <Text style={[
                  styles.passwordHint,
                  passwordValidation.minLength && styles.validRequirement
                ]}>
                  {language === 'es' ? '• Mínimo 8 caracteres' : '• Minimum 8 characters'}
                </Text>
                <Text style={[
                  styles.passwordHint,
                  passwordValidation.hasUpperCase && styles.validRequirement
                ]}>
                  {language === 'es' ? '• Al menos una mayúscula' : '• At least one uppercase letter'}
                </Text>
                <Text style={[
                  styles.passwordHint,
                  passwordValidation.hasNumber && styles.validRequirement
                ]}>
                  {language === 'es' ? '• Al menos un número' : '• At least one number'}
                </Text>
              </View>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.fieldLabel}>{t('confirmPassword')}</Text>
              <View style={[
                styles.inputWrapper,
                passwordsMatch === false && styles.inputError
              ]}>
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
                {renderValidationIcon(passwordsMatch)}
              </View>
              {passwordsMatch === false && (
                <Text style={styles.errorHint}>
                  {language === 'es' 
                    ? 'Las contraseñas no coinciden'
                    : 'Passwords do not match'}
                </Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={[
                styles.registerButton,
                (!usernameValid || !emailValid || !passwordValid || !passwordsMatch || usernameExists || emailExists) && 
                  username && email && password && confirmPassword ? 
                  styles.registerButtonDisabled : null
              ]}
              onPress={handleRegister}
              disabled={loading || Boolean((!usernameValid || !emailValid || !passwordValid || !passwordsMatch || usernameExists || emailExists) && 
                username && email && password && confirmPassword)}
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
  inputError: {
    borderColor: '#666666',
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputIconRight: {
    position: 'absolute',
    right: 10,
  },
  validationIcon: {
    position: 'absolute',
    right: 40,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#000000',
    fontSize: Math.min(width * 0.04, 16),
  },
  passwordRequirements: {
    marginTop: 5,
  },
  passwordHint: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  validRequirement: {
    color: '#999999',
    opacity: 0.8,
  },
  errorHint: {
    fontSize: 12,
    color: '#999999',
    marginTop: 3,
  },
  registerButton: {
    backgroundColor: '#1c1c1c',
    height: height * 0.055,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: height * 0.02,
  },
  registerButtonDisabled: {
    backgroundColor: '#666666',
    opacity: 0.7,
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
    color: '#999999',
    marginBottom: height * 0.015,
    textAlign: 'center',
    fontSize: Math.min(width * 0.035, 14),
  },
});

export default RegisterScreen;
