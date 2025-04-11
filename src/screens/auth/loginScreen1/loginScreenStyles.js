import { StyleSheet, Dimensions } from 'react-native';
import { appTheme } from '../../../context/ThemeContext';

// Obtener dimensiones de la pantalla para cálculos responsivos si se necesitan en el futuro
const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.colors.darkGrey,
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
    color: appTheme.colors.lightCream,
    marginBottom: 5,
  },
  welcomeBack: {
    fontSize: 20,
    color: appTheme.colors.white,
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
    color: appTheme.colors.white,
    marginBottom: 5,
    opacity: 0.7,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: appTheme.colors.lightCream,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingLeft: 40, // Espacio para el icono
    backgroundColor: appTheme.colors.lightCream, // Color crema sólido
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  forgotPasswordText: {
    color: appTheme.colors.white,
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#1c1c1c',
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  loginButtonText: {
    color: appTheme.colors.white,
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
    backgroundColor: appTheme.colors.input.border,
  },
  orText: {
    color: appTheme.colors.white,
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
    borderColor: appTheme.colors.input.border,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleText: {
    color: appTheme.colors.white,
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: appTheme.colors.white,
    opacity: 0.7,
    fontSize: 14,
  },
  registerLink: {
    color: appTheme.colors.lightCream,
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  errorText: {
    color: appTheme.colors.error,
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
  },
});

export default styles;