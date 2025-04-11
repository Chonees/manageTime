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
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState('Esperando activación...');
  const [logs, setLogs] = useState([]);
  const [usingRealVoice, setUsingRealVoice] = useState(false);
  
  // Referencia al servicio de asistente de voz
  const voiceAssistantRef = React.useRef(null);
  
  useEffect(() => {
    // Inicializar el servicio de asistente de voz
    const initVoiceAssistant = async () => {
      addLog('Inicializando asistente de voz...');
      
      if (!voiceAssistantRef.current) {
        voiceAssistantRef.current = new VoiceAssistantService();
      }
      
      const success = await voiceAssistantRef.current.initialize();
      
      if (success) {
        addLog('Asistente de voz inicializado correctamente.');
        setUsingRealVoice(voiceAssistantRef.current.usingRealRecognition);
        addLog(`Usando reconocimiento real: ${voiceAssistantRef.current.usingRealRecognition}`);
      } else {
        addLog('Error al inicializar el asistente de voz.');
        Alert.alert('Error', 'No se pudo inicializar el asistente de voz.');
      }
    };
    
    initVoiceAssistant();
    
    // Limpieza al desmontar
    return () => {
      if (voiceAssistantRef.current) {
        voiceAssistantRef.current.stop();
        addLog('Asistente de voz detenido.');
      }
    };
  }, []);
  
  // Función para añadir logs
  const addLog = (message) => {
    const timestamp = new Date().toISOString().substr(11, 8);
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };
  
  // Simular comandos de voz para pruebas
  const simulateVoiceCommand = async (command) => {
    if (!voiceAssistantRef.current) {
      Alert.alert('Error', 'El asistente de voz no está inicializado.');
      return;
    }
    
    addLog(`Simulando comando: "${command}"`);
    setStatusText(`Procesando: "${command}"`);
    
    try {
      await voiceAssistantRef.current.simulateVoiceRecognition(command);
      
      // Actualizar estado basado en el estado del asistente
      const state = voiceAssistantRef.current.recordingState;
      switch (state) {
        case 'listening_for_note':
          setStatusText('Grabando nota...');
          break;
        case 'confirming':
          setStatusText('Esperando confirmación...');
          break;
        case 'idle':
          setStatusText('Esperando activación...');
          break;
      }
    } catch (error) {
      addLog(`Error: ${error.message}`);
      Alert.alert('Error', `No se pudo procesar el comando: ${error.message}`);
    }
  };
  
  // Simular la activación por voz
  const activateVoiceAssistant = async () => {
    await simulateVoiceCommand('bitácora');
  };
  
  // Simular una nota
  const simulateNote = async () => {
    if (voiceAssistantRef.current?.recordingState !== 'listening_for_note') {
      Alert.alert('Error', 'Primero debe activar el asistente con "bitácora".');
      return;
    }
    
    await simulateVoiceCommand('Esta es una nota de prueba para la tarea activa');
  };
  
  // Simular confirmación
  const simulateConfirmation = async (isConfirmed) => {
    if (voiceAssistantRef.current?.recordingState !== 'confirming') {
      Alert.alert('Error', 'No hay una nota para confirmar.');
      return;
    }
    
    await simulateVoiceCommand(isConfirmed ? 'sí' : 'no');
  };
  
  // Reiniciar el reconocimiento de voz real
  const restartRealVoiceRecognition = async () => {
    if (!voiceAssistantRef.current) return;
    
    try {
      addLog('Reiniciando reconocimiento de voz real...');
      
      // Reinicializar el servicio de voz
      await voiceAssistantRef.current.stop();
      
      // Recrear el servicio
      voiceAssistantRef.current = new VoiceAssistantService();
      const success = await voiceAssistantRef.current.initialize();
      
      if (success) {
        setUsingRealVoice(voiceAssistantRef.current.usingRealRecognition);
        addLog(`Reconocimiento de voz reiniciado. Usando real: ${voiceAssistantRef.current.usingRealRecognition}`);
        Alert.alert('Éxito', 'Reconocimiento de voz reiniciado');
      } else {
        addLog('Error al reiniciar el reconocimiento de voz');
        Alert.alert('Error', 'No se pudo reiniciar el reconocimiento de voz');
      }
    } catch (error) {
      addLog(`Error al reiniciar: ${error.message}`);
      Alert.alert('Error', `No se pudo reiniciar: ${error.message}`);
    }
  };
  
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
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>Estado: {statusText}</Text>
            <Text style={styles.userIdText}>ID de usuario: {currentUserId}</Text>
            <Text style={styles.recognitionTypeText}>
              Reconocimiento de voz: {usingRealVoice ? 'REAL' : 'SIMULACIÓN'}
            </Text>
          </View>
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={activateVoiceAssistant}>
              <Text style={styles.buttonText}>Simular "bitácora"</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={simulateNote}>
              <Text style={styles.buttonText}>Simular nota</Text>
            </TouchableOpacity>
            
            <View style={styles.confirmButtonsRow}>
              <TouchableOpacity
                style={[styles.button, styles.confirmButton, { marginRight: 5 }]}
                onPress={() => simulateConfirmation(true)}>
                <Text style={styles.buttonText}>Simular "sí"</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { marginLeft: 5 }]}
                onPress={() => simulateConfirmation(false)}>
                <Text style={styles.buttonText}>Simular "no"</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.button, styles.restartButton]}
              onPress={restartRealVoiceRecognition}>
              <Text style={styles.buttonText}>Reiniciar reconocimiento real</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.logsContainer}>
            <Text style={styles.sectionTitle}>Registro de actividad:</Text>
            <ScrollView style={styles.logsScrollView}>
              {logs.map((log, index) => (
                <Text key={index} style={styles.logText}>
                  {log}
                </Text>
              ))}
            </ScrollView>
          </View>
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
  statusContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  userIdText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  recognitionTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007bff',
  },
  buttonsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  confirmButton: {
    backgroundColor: '#28a745',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    flex: 1,
  },
  restartButton: {
    backgroundColor: '#17a2b8',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logsScrollView: {
    flex: 1,
  },
  logText: {
    fontSize: 12,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default VoiceAssistantScreen;
