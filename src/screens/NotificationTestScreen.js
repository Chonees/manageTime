import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import * as Notifications from 'expo-notifications';
import { isUserAdmin, registerForPushNotifications } from '../services/notification-service';
import { getApiUrl } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotificationTestScreen = ({ navigation }) => {
  const theme = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [isAdmin, setIsAdmin] = useState(false);
  const [pushToken, setPushToken] = useState(null);
  const [adminRegistrationStatus, setAdminRegistrationStatus] = useState('unknown');

  useEffect(() => {
    checkPermissions();
    checkAdminStatus();
    getPushToken();
    checkAdminTokenRegistration();
  }, []);

  const checkPermissions = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const adminStatus = await isUserAdmin();
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const checkAdminTokenRegistration = async () => {
    try {
      const adminStatus = await isUserAdmin();
      setIsAdmin(adminStatus);
      
      if (!adminStatus) {
        setAdminRegistrationStatus('not_admin');
        return;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setAdminRegistrationStatus('no_auth');
        return;
      }

      const url = `${getApiUrl()}/api/notifications/admin/check-tokens`;
      console.log('Verificando tokens de admin en:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Respuesta de verificación de tokens:', response.status);
      
      if (!response.ok) {
        console.error('Error verificando tokens de admin:', response.status);
        setAdminRegistrationStatus('error');
        return;
      }

      const data = await response.json();
      console.log('Resultado de verificación de tokens:', data);
      
      // Verificar también si el usuario actual tiene su token registrado
      const pushToken = await getPushToken();
      if (pushToken) {
        setPushToken(pushToken);
      }
      
      setAdminRegistrationStatus(data.hasTokens ? 'registered' : 'not_registered');
    } catch (error) {
      console.error('Error checking admin token registration:', error);
      setAdminRegistrationStatus('error');
    }
  };

  const getPushToken = async () => {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: undefined,
      }).catch(() => null);
      
      if (tokenData) {
        const token = tokenData.data;
        setPushToken(token);
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  };

  const requestPermissions = async () => {
    try {
      setLoading(true);
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      setLoading(false);
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Notification permission is required for push notifications to work.',
          [{ text: 'OK' }]
        );
      } else {
        getPushToken();
        Alert.alert('Success', 'Notification permission granted!');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', `Failed to request permissions: ${error.message}`);
    }
  };

  const registerAdminToken = async () => {
    try {
      setLoading(true);
      
      // Primero intentamos obtener un token de push si no lo tenemos
      let currentToken = pushToken;
      if (!currentToken) {
        currentToken = await getPushToken();
        if (!currentToken) {
          Alert.alert('Error', 'No se pudo obtener un token de notificaciones push');
          setLoading(false);
          return;
        }
      }
      
      // Obtenemos el token de autenticación
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No hay token de autenticación disponible');
        setLoading(false);
        return;
      }
      
      // Verificamos explícitamente si el usuario es administrador
      const adminStatus = await isUserAdmin();
      if (!adminStatus) {
        Alert.alert('Error', 'Solo los administradores pueden registrar tokens para notificaciones de administrador');
        setLoading(false);
        return;
      }
      
      // Obtenemos la información del usuario para mostrarla en logs
      const userInfoString = await AsyncStorage.getItem('userInfo');
      const userInfo = userInfoString ? JSON.parse(userInfoString) : {};
      console.log('Intentando registrar token como admin:', userInfo.username, 'isAdmin:', userInfo.isAdmin);
      
      // Hacemos la solicitud al backend
      const url = `${getApiUrl()}/api/notifications/admin/register-token`;
      console.log('Registrando token de admin en:', url);
      console.log('Token de push a registrar:', currentToken);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pushToken: currentToken })
      });
      
      console.log('Respuesta de registro:', response.status);
      
      if (!response.ok) {
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = errorData.message || 'Error desconocido';
        } catch (e) {
          errorText = await response.text() || `Error HTTP ${response.status}`;
        }
        
        console.error('Error en registro:', errorText);
        Alert.alert('Error', `No se pudo registrar el token: ${errorText}`);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('Resultado del registro:', data);
      
      if (data.success) {
        setAdminRegistrationStatus('registered');
        Alert.alert('Éxito', 'Token de administrador registrado correctamente');
      } else {
        setAdminRegistrationStatus('error');
        Alert.alert('Error', data.message || 'Error desconocido');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error registrando token de admin:', error);
      setAdminRegistrationStatus('error');
      setLoading(false);
      Alert.alert('Error', `Error registrando token: ${error.message}`);
    }
  };

  const sendTestNotification = async () => {
    try {
      setLoading(true);
      
      // Verificamos que el usuario sea administrador
      if (!isAdmin) {
        Alert.alert('Error', 'Solo los administradores pueden enviar notificaciones de prueba');
        setLoading(false);
        return;
      }
      
      // Obtenemos el token de autenticación
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No hay token de autenticación disponible');
        setLoading(false);
        return;
      }
      
      // Hacemos la solicitud al backend
      const url = `${getApiUrl()}/api/notifications/admin/test`;
      console.log('Enviando notificación de prueba a:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Respuesta de envío:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error enviando notificación:', errorText);
        Alert.alert('Error', `No se pudo enviar la notificación: ${errorText}`);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('Resultado del envío:', data);
      
      if (data.success) {
        Alert.alert('Éxito', `Notificación de prueba enviada a ${data.message}`);
      } else {
        Alert.alert('Error', data.message || 'Error desconocido');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error enviando notificación de prueba:', error);
      setLoading(false);
      Alert.alert('Error', `Error enviando notificación: ${error.message}`);
    }
  };

  const forceRegisterToken = async () => {
    try {
      setLoading(true);
      const token = await registerForPushNotifications();
      if (token) {
        setPushToken(token);
        await checkAdminTokenRegistration();
        Alert.alert('Éxito', 'Token registrado correctamente');
      } else {
        Alert.alert('Error', 'No se pudo registrar el token');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error en forceRegisterToken:', error);
      setLoading(false);
      Alert.alert('Error', `Error registrando token: ${error.message}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Push Notification Settings</Text>
        <Text style={styles.headerSubtitle}>Configure push notifications for your device</Text>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Device Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Platform:</Text>
          <Text style={styles.infoValue}>{Platform.OS}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Admin Status:</Text>
          <Text style={[styles.infoValue, isAdmin ? styles.statusGood : styles.statusBad]}>
            {isAdmin ? 'Admin' : 'Regular User'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Notification Permission:</Text>
          <Text 
            style={[
              styles.infoValue, 
              permissionStatus === 'granted' ? styles.statusGood : 
              permissionStatus === 'denied' ? styles.statusBad : 
              styles.statusWarning
            ]}
          >
            {permissionStatus}
          </Text>
        </View>
        {isAdmin && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Admin Token Registration:</Text>
            <Text 
              style={[
                styles.infoValue, 
                adminRegistrationStatus === 'registered' ? styles.statusGood : 
                adminRegistrationStatus === 'not_registered' || adminRegistrationStatus === 'error' ? styles.statusBad : 
                styles.statusWarning
              ]}
            >
              {adminRegistrationStatus === 'registered' ? 'Registered' : 
               adminRegistrationStatus === 'not_registered' ? 'Not Registered' :
               adminRegistrationStatus === 'error' ? 'Error' :
               adminRegistrationStatus === 'no_auth' ? 'No Auth Token' :
               adminRegistrationStatus === 'not_admin' ? 'Not Admin' : 'Unknown'}
            </Text>
          </View>
        )}
      </View>
      
      {!isAdmin && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={24} color="#ffcc00" />
          <Text style={styles.warningText}>
            You are not logged in as an admin user. Admin notifications are only available for admin users.
          </Text>
        </View>
      )}

      {pushToken && (
        <View style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>Your Push Token:</Text>
          <Text style={styles.tokenValue}>{pushToken}</Text>
          <Text style={styles.tokenDescription}>
            This token is used by the server to send push notifications directly to your device.
            Push notifications can be received even when the app is in background.
          </Text>
        </View>
      )}
      
      <View style={styles.infoTextContainer}>
        <Text style={styles.infoTextTitle}>About Push Notifications</Text>
        <Text style={styles.infoText}>
          Local notifications have been removed from this app as they do not work properly when the app is in the background.
          Instead, the app now uses push notifications sent from the server, which can be received even when the app is not active.
        </Text>
        <Text style={styles.infoText}>
          For administrators, push notifications will be sent when:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• A user enters or exits a location</Text>
          <Text style={styles.bulletItem}>• A user changes their availability status</Text>
          <Text style={styles.bulletItem}>• Tasks are created, completed, or updated</Text>
        </View>
        <Text style={styles.infoText}>
          Regular users will receive notifications for task assignments and reminders.
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        {permissionStatus !== 'granted' && (
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }
            ]}
            onPress={requestPermissions}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Request Notification Permission</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.accent, opacity: loading ? 0.7 : 1 }
          ]}
          onPress={forceRegisterToken}
          disabled={loading || permissionStatus !== 'granted'}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Register Push Token</Text>
          )}
        </TouchableOpacity>
        
        {isAdmin && permissionStatus === 'granted' && (
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }
            ]}
            onPress={registerAdminToken}
            disabled={loading || adminRegistrationStatus === 'registered'}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {adminRegistrationStatus === 'registered' ? 'Admin Token Registered' : 'Register Admin Token'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {isAdmin && permissionStatus === 'granted' && adminRegistrationStatus === 'registered' && (
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: '#4cd964', opacity: loading ? 0.7 : 1 }
            ]}
            onPress={sendTestNotification}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Send Test Notification</Text>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.secondary, opacity: loading ? 0.7 : 1 }
          ]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ccc',
  },
  infoContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: '#3a3a3a',
    borderRadius: 10,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
  },
  infoLabel: {
    fontSize: 16,
    color: '#ccc',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  warningContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: '#3a3a3a',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    marginLeft: 10,
    color: '#ffcc00',
    flex: 1,
  },
  tokenContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: '#3a3a3a',
    borderRadius: 10,
  },
  tokenLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 10,
  },
  tokenValue: {
    fontSize: 14,
    color: '#4cd964',
    padding: 10,
    backgroundColor: '#222',
    borderRadius: 5,
    marginBottom: 10,
  },
  tokenDescription: {
    fontSize: 14,
    color: '#ccc',
    fontStyle: 'italic',
  },
  infoTextContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: '#3a3a3a',
    borderRadius: 10,
  },
  infoTextTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 10,
    lineHeight: 20,
  },
  bulletList: {
    marginLeft: 10,
    marginBottom: 10,
  },
  bulletItem: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
    lineHeight: 20,
  },
  buttonContainer: {
    margin: 15,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusGood: {
    color: '#4cd964',
  },
  statusBad: {
    color: '#ff3b30',
  },
  statusWarning: {
    color: '#ffcc00',
  },
});

export default NotificationTestScreen;
