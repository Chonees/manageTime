import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import voiceAssistant from '../services/VoiceAssistantService';
import { useLanguage } from '../context/LanguageContext';

/**
 * Componente para simular y probar la funcionalidad de asistente de voz
 * Este componente NO será necesario en la app de producción, es solo para pruebas
 */
const VoiceAssistantSimulator = () => {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Inicializar el asistente de voz
  useEffect(() => {
    const initializeAssistant = async () => {
      // Interceptar console.log para mostrar mensajes de voz en la UI
      const originalConsoleLog = console.log;
      console.log = function(...args) {
        originalConsoleLog.apply(console, args);
        
        if (args[0] === '[Voz]') {
          setLogs(prev => [...prev, { type: 'voice', message: args.slice(1).join(' ') }]);
        }
      };
      
      await voiceAssistant.initialize();
      setIsInitialized(true);
      
      setLogs(prev => [...prev, { 
        type: 'info', 
        message: 'Simulador de asistente de voz inicializado. Escribe "bitacora" para empezar.'
      }]);
      
      return () => {
        console.log = originalConsoleLog;
        voiceAssistant.stop();
      };
    };
    
    initializeAssistant();
  }, []);

  // Simular reconocimiento de voz
  const simulateVoiceInput = async () => {
    if (!input.trim()) return;
    
    setLogs(prev => [...prev, { type: 'user', message: input }]);
    await voiceAssistant.simulateVoiceRecognition(input);
    setInput('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Ionicons name="mic" size={24} color="#fff3e5" />
        <Text style={styles.header}>{t('voiceAssistant')}</Text>
      </View>
      
      <ScrollView style={styles.logsContainer}>
        {logs.map((log, index) => (
          <View 
            key={index} 
            style={[
              styles.logItem, 
              log.type === 'user' ? styles.userLog : 
              log.type === 'voice' ? styles.voiceLog : styles.infoLog
            ]}
          >
            {log.type === 'user' && <Ionicons name="person" size={16} color="#2e2e2e" style={styles.logIcon} />}
            {log.type === 'voice' && <Ionicons name="volume-high" size={16} color="#2e2e2e" style={styles.logIcon} />}
            {log.type === 'info' && <Ionicons name="information-circle" size={16} color="#2e2e2e" style={styles.logIcon} />}
            <Text style={styles.logText}>{log.message}</Text>
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={t('typeSomething')}
          placeholderTextColor="#999"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={simulateVoiceInput}
        />
        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={simulateVoiceInput}
          disabled={!isInitialized || !input.trim()}
        >
          <Ionicons name="send" size={24} color="#fff3e5" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.helpText}>
        {t('voiceAssistantHelp')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    margin: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e2e2e',
    padding: 10,
    borderRadius: 8,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginLeft: 10,
  },
  logsContainer: {
    marginTop: 10,
    maxHeight: 300,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 5,
    borderRadius: 5,
  },
  userLog: {
    backgroundColor: '#e6e6e6',
    alignSelf: 'flex-end',
  },
  voiceLog: {
    backgroundColor: '#fff3e5',
    alignSelf: 'flex-start',
  },
  infoLog: {
    backgroundColor: '#e8f4f8',
    alignSelf: 'center',
  },
  logIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  logText: {
    color: '#333',
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#2e2e2e',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  helpText: {
    fontSize: 12,
    color: '#777',
    marginTop: 10,
    textAlign: 'center',
  }
});

export default VoiceAssistantSimulator;
