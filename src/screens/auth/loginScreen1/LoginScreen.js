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
import { Ionicons } from '@expo/vector-icons';
import styles from './loginScreenStyles';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error, setLoading, setError } = useAuth();
  const theme = useTheme();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
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
        const errorMessage = result?.error || 'Please try again';
        console.log('Login fallido:', errorMessage);
        setError(errorMessage);
        Alert.alert('Login Error', errorMessage);
      } else {
        console.log('Login exitoso, usuario:', result.user?.username);
      }
    } catch (error) {
      console.error('Error en login:', error);
      setError('An unexpected error occurred');
      Alert.alert('Error', 'An unexpected error occurred');
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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../../../assets/Work Proof LOGO CREMA.png')} 
              style={styles.logo} 
            />
          </View>
          <Text style={styles.greeting}>Hello.</Text>
          <Text style={styles.welcomeBack}>Welcome back</Text>
        </View>

        <View style={styles.formContainer}>
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <View style={styles.inputContainer}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={{ position: 'relative' }}>
              <Ionicons 
                name="mail-outline" 
                size={24} 
                color="#000000" 
                style={[styles.inputIcon, { color: '#000000' }]}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter email"
                placeholderTextColor={'rgba(0,0,0,0.5)'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={{ position: 'relative' }}>
              <Ionicons 
                name="lock-closed-outline" 
                size={24} 
                color="#000000" 
                style={[styles.inputIcon, { color: '#000000' }]}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
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
          
          <TouchableOpacity 
            style={styles.forgotPasswordContainer} 
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.darkGrey} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.orContainer}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR CONTINUE WITH</Text>
            <View style={styles.orLine} />
          </View>
          
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity style={styles.googleButton}>
              <Ionicons name="logo-google" size={24} color={theme.colors.white} style={styles.googleIcon} />
              <Text style={styles.googleText}>Google</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
          
          {/* El botón de diagnóstico se puede mantener para desarrollo, pero se puede ocultar en producción */}
          {__DEV__ && (
            <TouchableOpacity
              style={[styles.loginButton, { marginTop: 30, backgroundColor: theme.colors.darkGrey, borderWidth: 1, borderColor: theme.colors.input.border }]}
              onPress={() => navigation.navigate('Diagnostic')}
            >
              <Text style={[styles.loginButtonText, { color: theme.colors.white }]}>Diagnostic</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
