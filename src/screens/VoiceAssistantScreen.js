import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import * as api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VoiceAssistantScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const [userTasks, setUserTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    // Cargar tareas del usuario
    const loadUserTasks = async () => {
      try {
        addLog('Cargando tareas del usuario...');
        const tasks = await api.getUserTasks();
        setUserTasks(tasks);
        addLog(`Se cargaron ${tasks.length} tareas`);
        
        // Verificar si hay una tarea activa
        const activeTasks = tasks.filter(task => !task.completed && task.isWithinRadius);
        if (activeTasks.length > 0) {
          setActiveTask(activeTasks[0]);
          addLog(`Tarea activa encontrada: ${activeTasks[0].title}`);
        }
      } catch (error) {
        addLog(`Error al cargar tareas: ${error.message}`);
      }
    };
    
    loadUserTasks();
  }, []);
  
  // Función para añadir logs
  const addLog = (message) => {
    const timestamp = new Date().toISOString().substr(11, 8);
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="mic" size={24} color="#fff" />
        <Text style={styles.headerTitle}>{t('voiceAssistant')}</Text>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>{t('voiceAssistantInstructions')}</Text>
        <Text style={styles.infoText}>
          {t('voiceAssistantExplanation') || 'Di "hola" para activar el asistente de voz y grabar una nota.'}
        </Text>
        
        <View style={styles.keywordContainer}>
          <Text style={styles.keywordLabel}>{t('activationKeyword') || 'Palabra clave'}:</Text>
          <Text style={styles.keyword}>hola</Text>
        </View>
      </View>
      
      {activeTask ? (
        <View style={styles.activeTaskContainer}>
          <Text style={styles.activeTaskTitle}>{t('activeTask') || 'Tarea activa'}:</Text>
          <Text style={styles.activeTaskName}>{activeTask.title}</Text>
          <Text style={styles.activeTaskInstruction}>
            {t('sayActivationKeywordToRecord') || 'Di "hola" para grabar una nota para esta tarea.'}
          </Text>
        </View>
      ) : (
        <View style={styles.noTaskContainer}>
          <Ionicons name="information-circle" size={24} color="#888" />
          <Text style={styles.noTaskText}>{t('noActiveTaskForVoice') || 'No hay tareas activas para el asistente de voz.'}</Text>
        </View>
      )}
      
      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>{t('activityLog') || 'Registro de actividad'}</Text>
        <ScrollView style={styles.logs}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logItem}>{log}</Text>
          ))}
        </ScrollView>
      </View>
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
    backgroundColor: '#4a6da7',
    padding: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  infoContainer: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  infoTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  keywordContainer: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },
  keywordLabel: {
    fontSize: 14,
    color: '#333',
  },
  keyword: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a6da7',
    marginLeft: 5,
  },
  activeTaskContainer: {
    backgroundColor: '#e6f0ff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#4a6da7',
  },
  activeTaskTitle: {
    fontSize: 14,
    color: '#444',
  },
  activeTaskName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  activeTaskInstruction: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
  },
  noTaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  noTaskText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
  logsContainer: {
    flex: 1,
    margin: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  logsTitle: {
    backgroundColor: '#eee',
    padding: 10,
    fontWeight: 'bold',
    color: '#555',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  logs: {
    flex: 1,
    padding: 10,
  },
  logItem: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#333',
    marginBottom: 3,
  }
});

export default VoiceAssistantScreen;
