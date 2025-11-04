# README: src/screens/auth/loginScreen1/LoginScreen.js - Pantalla de Inicio de Sesión

## 📋 **¿Qué es este archivo?**

`LoginScreen.js` es la **pantalla de autenticación principal** de ManageTime. Presenta una interfaz moderna con el logo Work Proof, campos de email/contraseña con iconos, toggle de idioma, y manejo robusto de errores. Incluye traducción completa de mensajes de error y validación de entrada antes de enviar al backend.

## 🎯 **Propósito**
- Proporcionar interfaz de login intuitiva y moderna
- Validar credenciales antes de enviar
- Manejar errores específicos con mensajes traducidos
- Mostrar/ocultar contraseña con toggle
- Soportar cambio de idioma en tiempo real
- Normalizar email a minúsculas
- Proporcionar feedback visual durante carga
- Navegación a registro y recuperación de contraseña

## ⚡ **¿Cómo funciona?**

La pantalla maneja el **flujo completo de login**:
1. **Validación local** de campos vacíos
2. **Normalización** de email a minúsculas
3. **Llamada al contexto** AuthContext.login()
4. **Traducción de errores** según código de respuesta
5. **Navegación automática** si login exitoso
6. **Feedback visual** con loading y alertas

---

## 📖 **Explicación del Componente**

### **Líneas 1-20: Importaciones**
```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Dimensions } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import styles from './loginScreenStyles';
import LanguageToggle from '../../../components/LanguageToggle';
```
- **React Native Core**: Componentes UI necesarios
- **Contextos**: Auth, Theme, Language para estado global
- **Ionicons**: Iconos de email, password, eye
- **Estilos externos**: Separados en loginScreenStyles.js
- **LanguageToggle**: Componente para cambiar idioma

### **Líneas 22-28: Estado del Componente**
```javascript
const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error, setLoading, setError } = useAuth();
  const theme = useTheme();
  const { t } = useLanguage();
```
- **Estados locales**: email, password, showPassword
- **AuthContext**: login, loading, error y setters
- **t function**: Para traducciones dinámicas

---

## 🔐 **Función handleLogin (Líneas 30-76)**

### **Validación Local:**
```javascript
if (!email.trim() || !password.trim()) {
  Alert.alert(t('error'), t('pleaseEnterEmailAndPassword'));
  return;
}
```
- **Validación básica**: Campos no vacíos
- **Alert traducido**: Mensaje en idioma actual

### **Normalización y Login:**
```javascript
const normalizedEmail = email.toLowerCase();
console.log('Usuario normalizado:', normalizedEmail);

const result = await login(normalizedEmail, password);
```
- **toLowerCase()**: Emails siempre en minúsculas
- **Logging**: Para debugging
- **Await login**: Espera resultado del contexto

### **Manejo de Errores Específicos:**
```javascript
if (!result || !result.success) {
  let errorMessage = result?.error || t('pleaseTryAgain');
  
  // Traducir códigos de error de la API
  if (errorMessage.includes('USER_DISABLED')) {
    errorMessage = t('userDisabled') || 'Este usuario ha sido desactivado...';
  } else if (errorMessage.includes('USER_NOT_FOUND')) {
    errorMessage = t('userNotFound') || 'Usuario no encontrado...';
  } else if (errorMessage.includes('INCORRECT_PASSWORD')) {
    errorMessage = t('incorrectPassword') || 'Contraseña incorrecta...';
  } else if (errorMessage.includes('CONNECTION_ERROR')) {
    errorMessage = t('connectionError') || 'Error de conexión...';
  } else if (errorMessage.includes('SERVER_ERROR')) {
    errorMessage = t('serverError') || 'Error en el servidor...';
  }
  
  Alert.alert(t('loginError'), errorMessage);
}
```

### **Tabla de Códigos de Error:**
| Código | Mensaje Traducido | Causa |
|--------|-------------------|-------|
| USER_DISABLED | Usuario desactivado. Contacte admin | Admin desactivó cuenta |
| USER_NOT_FOUND | Usuario no encontrado | Email/username incorrecto |
| INCORRECT_PASSWORD | Contraseña incorrecta | Password no coincide |
| CONNECTION_ERROR | Error de conexión | Sin internet/servidor |
| SERVER_ERROR | Error en servidor | Backend con problemas |

---

## 🎨 **Estructura de UI**

### **1. Header con Logo (Líneas 91-100):**
```javascript
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
```
- **Logo Work Proof**: 300x300px en crema
- **Saludo**: "Hello" en 45px
- **Subtítulo**: "Welcome back" en 20px

### **2. Campo de Email (Líneas 105-124):**
```javascript
<View style={styles.inputContainer}>
  <Text style={styles.fieldLabel}>{t('email')}</Text>
  <View style={{ position: 'relative' }}>
    <Ionicons 
      name="mail-outline" 
      size={24} 
      color="#000000" 
      style={styles.inputIcon}
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
```
- **Icono mail**: A la izquierda del campo
- **autoCapitalize="none"**: Sin mayúsculas automáticas
- **keyboardType="email-address"**: Teclado optimizado

### **3. Campo de Password con Toggle (Líneas 126-153):**
```javascript
<View style={styles.inputContainer}>
  <Text style={styles.fieldLabel}>{t('password')}</Text>
  <View style={{ position: 'relative' }}>
    <Ionicons 
      name="lock-closed-outline" 
      size={24} 
      color="#000000" 
      style={styles.inputIcon}
    />
    <TextInput
      style={styles.input}
      placeholder={t('enterPassword')}
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
```
- **Icono candado**: A la izquierda
- **Toggle eye**: A la derecha para mostrar/ocultar
- **secureTextEntry**: Oculta caracteres

### **4. Botón de Login (Líneas 154-168):**
```javascript
<TouchableOpacity 
  style={[styles.loginButton, loading && styles.disabledButton]}
  onPress={handleLogin}
  disabled={loading}
>
  {loading ? (
    <ActivityIndicator color="#2e2e2e" size="small" />
  ) : (
    <>
      <Ionicons name="log-in-outline" size={24} color="#2e2e2e" />
      <Text style={styles.loginButtonText}>{t('login')}</Text>
    </>
  )}
</TouchableOpacity>
```
- **Estado loading**: Muestra spinner
- **Deshabilitado**: Durante proceso de login
- **Icono + texto**: Para mejor UX

### **5. Login con Google (Líneas 170-179):**
```javascript
<View style={styles.dividerContainer}>
  <View style={styles.divider} />
  <Text style={styles.dividerText}>{t('or')}</Text>
  <View style={styles.divider} />
</View>

<TouchableOpacity style={styles.googleButton}>
  <Text style={styles.googleButtonText}>Google</Text>
</TouchableOpacity>
```
- **Divider estilizado**: Con "O" centrado
- **Botón Google**: Preparado para OAuth (no implementado)

### **6. Links de Navegación (Líneas 180-189):**
```javascript
<View style={styles.linksContainer}>
  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
    <Text style={styles.linkText}>{t('forgotPassword')}</Text>
  </TouchableOpacity>
  
  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
    <Text style={styles.linkText}>{t('noAccount')}</Text>
  </TouchableOpacity>
</View>
```
- **Forgot Password**: Navegación a recuperación
- **Register**: Navegación a registro

---

## 🌍 **Sistema de Idiomas**

### **Toggle de Idioma:**
```javascript
<View style={styles.languageToggleContainer}>
  <LanguageToggle />
</View>
```
- **Posición**: Esquina superior derecha
- **Cambio dinámico**: Sin recargar pantalla
- **Persiste**: En AsyncStorage

### **Traducciones Utilizadas:**
| Key | Español | English |
|-----|---------|---------|
| hello | Hola | Hello |
| welcomeBack | Bienvenido de vuelta | Welcome back |
| email | Correo electrónico | Email |
| password | Contraseña | Password |
| login | Iniciar sesión | Login |
| forgotPassword | ¿Olvidaste tu contraseña? | Forgot password? |
| noAccount | ¿No tienes cuenta? Regístrate | Don't have an account? Sign up |
| userDisabled | Usuario desactivado | User disabled |
| userNotFound | Usuario no encontrado | User not found |
| incorrectPassword | Contraseña incorrecta | Incorrect password |

---

## 📱 **Manejo de Teclado**

```javascript
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={styles.container}
>
  <ScrollView contentContainerStyle={styles.scrollContainer}>
    {/* Contenido */}
  </ScrollView>
</KeyboardAvoidingView>
```
- **iOS**: Padding behavior
- **Android**: Height behavior
- **ScrollView**: Para pantallas pequeñas

---

## 🎨 **Estilos Principales (loginScreenStyles.js)**

```javascript
export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e', // Gris oscuro
  },
  logo: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
  greeting: {
    fontSize: 45,
    fontWeight: 'bold',
    color: '#fff3e5', // Crema
  },
  input: {
    backgroundColor: 'rgba(255, 243, 229, 0.1)',
    borderWidth: 1,
    borderColor: '#fff3e5',
    borderRadius: 12,
    paddingLeft: 50, // Espacio para icono
    paddingRight: 50, // Espacio para toggle
    color: '#fff3e5',
  },
  loginButton: {
    backgroundColor: '#fff3e5',
    borderRadius: 25,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#fff3e5',
    borderRadius: 25,
  }
});
```

---

## 🔄 **Flujo de Login Completo**

```
Usuario ingresa credenciales
    ↓
Validación local (campos vacíos)
    ↓
Normalizar email (lowercase)
    ↓
Mostrar loading
    ↓
AuthContext.login()
    ↓
Backend valida
    ↓
SUCCESS                     ERROR
    ↓                         ↓
Token guardado          Traducir código error
    ↓                         ↓
Navigate Dashboard      Mostrar Alert
```

---

## 🚨 **Manejo de Estados**

### **Estados de Loading:**
1. Botón deshabilitado
2. ActivityIndicator visible
3. Inputs bloqueados

### **Estados de Error:**
1. Mensaje en rojo arriba del form
2. Alert modal con detalles
3. Campos mantienen valores

---

## 📝 **Notas Importantes**

- **Email normalizado**: Siempre lowercase
- **Errores traducidos**: Según idioma actual
- **Google login**: UI lista, falta OAuth
- **Toggle password**: UX mejorada
- **Logging**: Para debugging en desarrollo
- **Estilos externos**: Mejor mantenibilidad

Esta pantalla es la **puerta de entrada** a la aplicación y debe proporcionar una experiencia fluida y profesional.
