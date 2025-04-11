import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import VoiceAssistantSimulator from '../components/VoiceAssistantSimulator';
import * as api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VoiceAssistantScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const [taskId, setTaskId] = useState('');
  const [loading, setLoading] = useState(false);
  const [userTasks, setUserTasks] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');
  
  // Cargar tareas del usuario al montar el componente
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasks = await api.getUserTasks();
        setUserTasks(tasks);
      } catch (error) {
        console.error('Error al cargar tareas:', error);
      }
    };
    
    fetchTasks();
  }, []);
  
  // Añadir función para verificar usuario actual
  useEffect(() => {
    const checkCurrentUser = async () => {
      try {
        // Obtener token del almacenamiento
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        
        // Decodificar el JWT para obtener el ID de usuario
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decodedData = JSON.parse(atob(base64));
        
        // Mostrar el ID del usuario actual
        if (decodedData && decodedData.id) {
          setCurrentUserId(decodedData.id);
          console.log('ID del usuario actual:', decodedData.id);
        }
      } catch (error) {
        console.error('Error al verificar usuario:', error);
      }
    };
    
    checkCurrentUser();
  }, []);

  // Función para activar el modo manos libres
  const activateHandsFreeMode = async () => {
    if (!taskId) {
      Alert.alert('Error', 'Por favor ingresa el ID de la tarea');
      return;
    }
    
    setLoading(true);
    
    try {
      const updatedTask = await api.enableHandsFreeMode(taskId);
      
      Alert.alert(
        'Éxito',
        `Modo manos libres activado para la tarea "${updatedTask.title}"`,
        [{ text: 'OK' }]
      );
      
      // Limpiar el campo
      setTaskId('');
    } catch (error) {
      Alert.alert('Error', `No se pudo activar el modo manos libres: ${error.message}`);
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff3e5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('voiceAssistant')}</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#2e2e2e" />
          <Text style={styles.infoTitle}>{t('voiceCommandsHelp')}</Text>
          <Text style={styles.infoText}>
            1. {t('voiceAssistantHelp')}
          </Text>
          <Text style={styles.infoText}>
            2. Di "bitacora" para iniciar una nota en una tarea activa.
          </Text>
          <Text style={styles.infoText}>
            3. Habla claramente y confirma con "sí" cuando te lo pida.
          </Text>
          {currentUserId && (
            <View style={styles.userInfo}>
              <Text style={styles.userIdLabel}>Tu ID de usuario actual:</Text>
              <Text style={styles.userId}>{currentUserId}</Text>
              <Text style={styles.userIdHint}>
                Asegúrate que las tareas estén asignadas a este ID de usuario
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activar Modo Manos Libres</Text>
          <View style={styles.activationContainer}>
            <TextInput
              style={styles.taskIdInput}
              placeholder="ID de la tarea (ej: 67f97d994238392efffd7caf)"
              value={taskId}
              onChangeText={setTaskId}
            />
            <TouchableOpacity
              style={styles.activateButton}
              onPress={activateHandsFreeMode}
              disabled={loading}
            >
              <Text style={styles.activateButtonText}>
                {loading ? 'Activando...' : 'Activar'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {userTasks.length > 0 && (
            <View style={styles.tasksContainer}>
              <Text style={styles.subsectionTitle}>Tus Tareas Disponibles:</Text>
              {userTasks.map(task => (
                <TouchableOpacity
                  key={task._id}
                  style={styles.taskItem}
                  onPress={() => setTaskId(task._id)}
                >
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskId}>ID: {task._id}</Text>
                  <Text style={styles.taskStatus}>
                    Estado: {task.status || 'pendiente'} | 
                    Manos libres: {task.handsFreeMode ? 'Activo' : 'Inactivo'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Probar Asistente de Voz</Text>
          <VoiceAssistantSimulator />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e2e2e',
    padding: 15,
    paddingTop: 40, // Extra padding for status bar
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff3e5',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  infoCard: {
    backgroundColor: '#fff3e5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#2e2e2e',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2e2e2e',
  },
  activationContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  taskIdInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activateButton: {
    backgroundColor: '#2e2e2e',
    borderRadius: 5,
    padding: 10,
    justifyContent: 'center',
  },
  activateButtonText: {
    color: '#fff3e5',
    fontWeight: 'bold',
  },
  tasksContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2e2e2e',
  },
  taskItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2e2e2e',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e2e2e',
  },
  taskId: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  taskStatus: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
  emptyMessage: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    color: '#777',
    textAlign: 'center',
  },
  userInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 5,
  },
  userIdLabel: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#2e2e2e',
  },
  userId: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    padding: 5,
    backgroundColor: '#fff',
    borderRadius: 3,
    marginVertical: 5,
  },
  userIdHint: {
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
  },
});

export default VoiceAssistantScreen;
