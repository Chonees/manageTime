import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import voiceAssistantService from '../services/VoiceAssistantService';
import { getApiUrl } from '../services/platform-config';

// Constantes para configuración
const LISTENING_INTERVAL = 5000; // Intervalo de escucha en ms (5 segundos)
const LISTENING_DURATION = 3000; // Duración de cada escucha en ms (3 segundos)
const ACTIVATION_KEYWORD = 'bitacora'; // Palabra clave de activación (sin tilde)

const VoiceListener = ({ isTaskActive = false, taskData = null }) => {
  // Estados
  const [isListening, setIsListening] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastRecognizedText, setLastRecognizedText] = useState('');
  const [debugMessages, setDebugMessages] = useState([]);
  
  // Referencias para timers y grabación
  const recordingRef = useRef(null);
  const listeningTimerRef = useRef(null);
  const intervalTimerRef = useRef(null);
  
  // Para debug
  const addDebugMessage = (message) => {
    console.log(`[VoiceListener] ${message}`);
    setDebugMessages(prev => [message, ...prev.slice(0, 9)]);
  };
  
  // Inicializar el sistema de escucha
  useEffect(() => {
    // Solo activar si hay una tarea activa
    if (isTaskActive) {
      startListeningCycle();
      addDebugMessage('Iniciando sistema de escucha continua para tareas');
      
      // Informar brevemente al usuario
      Speech.speak("Sistema de voz activado. Diga bitácora para tomar notas.", {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9
      });
      
      setIsEnabled(true);
    } else {
      stopListeningCycle();
      setIsEnabled(false);
    }
    
    // Limpiar al desmontar
    return () => {
      stopListeningCycle();
    };
  }, [isTaskActive]);
  
  // Función para iniciar el ciclo de escucha
  const startListeningCycle = () => {
    // Detener cualquier ciclo existente primero
    stopListeningCycle();
    
    // Iniciar el ciclo con un breve retraso
    setTimeout(() => {
      // Verificar permisos de audio primero
      checkAudioPermissions().then(hasPermissions => {
        if (hasPermissions) {
          // Iniciar primer ciclo de escucha
          startListeningForKeyword();
          
          // Establecer intervalos regulares para escuchar
          intervalTimerRef.current = setInterval(() => {
            if (!isListening) {
              startListeningForKeyword();
            }
          }, LISTENING_INTERVAL);
          
          addDebugMessage('Ciclo de escucha iniciado');
        } else {
          addDebugMessage('No se tienen permisos de audio');
          Alert.alert(
            "Permiso de audio requerido",
            "Para usar el asistente de voz, necesitamos permiso para acceder al micrófono.",
            [{ text: "OK" }]
          );
        }
      });
    }, 1000);
  };
  
  // Detener el ciclo de escucha
  const stopListeningCycle = () => {
    // Detener la escucha actual si existe
    stopListening();
    
    // Limpiar el intervalo
    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }
    
    addDebugMessage('Ciclo de escucha detenido');
  };
  
  // Verificar permisos de audio
  const checkAudioPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      addDebugMessage(`Estado de permisos: ${status}`);
      return status === 'granted';
    } catch (error) {
      addDebugMessage(`Error verificando permisos: ${error.message}`);
      return false;
    }
  };
  
  // Asegurarse de que no haya grabaciones activas
  const ensureNoActiveRecordings = async () => {
    try {
      if (recordingRef.current) {
        addDebugMessage('Deteniendo grabación existente');
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (error) {
          // Ignorar errores al detener
        }
        recordingRef.current = null;
      }
      
      // Para Android, reiniciar completamente el sistema de audio
      if (Platform.OS === 'android') {
        await Audio.setIsEnabledAsync(false);
        await new Promise(resolve => setTimeout(resolve, 300));
        await Audio.setIsEnabledAsync(true);
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        // Para iOS, configuración específica
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });
      }
      
      return true;
    } catch (error) {
      addDebugMessage(`Error limpiando grabaciones: ${error.message}`);
      return false;
    }
  };
  
  // Iniciar escucha para detectar palabra clave
  const startListeningForKeyword = async () => {
    // Si ya está escuchando, no hacer nada
    if (isListening) return;
    
    try {
      // Verificar permisos
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      
      // Limpiar grabaciones anteriores
      await ensureNoActiveRecordings();
      
      // Crear nueva grabación
      addDebugMessage('Iniciando escucha para palabra clave');
      const recording = new Audio.Recording();
      
      // Configuración simplificada para mayor compatibilidad
      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      
      // Guardar referencia
      recordingRef.current = recording;
      
      // Iniciar grabación
      await recording.startAsync();
      setIsListening(true);
      
      // Configurar temporizador para detener después de un tiempo
      if (listeningTimerRef.current) {
        clearTimeout(listeningTimerRef.current);
      }
      
      listeningTimerRef.current = setTimeout(() => {
        processRecording();
      }, LISTENING_DURATION);
      
    } catch (error) {
      addDebugMessage(`Error iniciando escucha: ${error.message}`);
      setIsListening(false);
      
      // Limpiar cualquier grabación
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (stopError) {
          // Ignorar errores al detener
        }
        recordingRef.current = null;
      }
    }
  };
  
  // Detener escucha
  const stopListening = async () => {
    // Limpiar temporizador
    if (listeningTimerRef.current) {
      clearTimeout(listeningTimerRef.current);
      listeningTimerRef.current = null;
    }
    
    // Si no hay grabación, salir
    if (!recordingRef.current) {
      setIsListening(false);
      return null;
    }
    
    // Detener grabación
    let audioUri = null;
    
    try {
      await recordingRef.current.stopAndUnloadAsync();
      
      // Obtener URI
      audioUri = recordingRef.current.getURI();
      
      // Verificar que el archivo exista
      if (audioUri) {
        const fileInfo = await FileSystem.getInfoAsync(audioUri);
        if (!fileInfo.exists) {
          audioUri = null;
        }
      }
    } catch (error) {
      addDebugMessage(`Error deteniendo grabación: ${error.message}`);
    }
    
    // Limpiar recursos
    recordingRef.current = null;
    setIsListening(false);
    
    return audioUri;
  };
  
  // Procesar la grabación
  const processRecording = async () => {
    try {
      // Detener grabación y obtener URI
      const audioUri = await stopListening();
      
      if (!audioUri) {
        return;
      }
      
      // Procesar audio con Google Speech-to-Text
      try {
        const recognizedText = await recognizeWithGoogleSpeech(audioUri);
        setLastRecognizedText(recognizedText);
        
        // Detectar palabra clave
        if (recognizedText && recognizedText.toLowerCase().includes(ACTIVATION_KEYWORD)) {
          addDebugMessage(`¡Palabra clave detectada! "${recognizedText}"`);
          
          // Activar asistente de voz
          await activateVoiceAssistant();
        } else {
          addDebugMessage(`Texto reconocido (sin palabra clave): "${recognizedText || 'vacío'}"`);
        }
      } catch (error) {
        addDebugMessage(`Error procesando audio: ${error.message}`);
      }
    } catch (error) {
      addDebugMessage(`Error general en processRecording: ${error.message}`);
    }
  };
  
  // Activar el asistente de voz
  const activateVoiceAssistant = async () => {
    try {
      // Pausar el ciclo de escucha mientras se usa el asistente
      stopListeningCycle();
      
      // Enviar al asistente de voz
      addDebugMessage('Activando asistente de voz');
      
      // Usar la simulación para activar el asistente
      await voiceAssistantService.simulateVoiceRecognition('bitácora');
      
      // Esperar a que el asistente complete su ciclo
      // Este timeout da tiempo para que el usuario dicte la nota
      setTimeout(() => {
        // Reiniciar el ciclo de escucha después de un tiempo
        if (isTaskActive) {
          addDebugMessage('Reactivando ciclo de escucha después de usar asistente');
          startListeningCycle();
        }
      }, 20000); // 20 segundos para permitir el ciclo completo del asistente
      
    } catch (error) {
      addDebugMessage(`Error activando asistente: ${error.message}`);
      
      // Reiniciar ciclo de escucha en caso de error
      if (isTaskActive) {
        startListeningCycle();
      }
    }
  };
  
  // Reconocer audio con Google Speech-to-Text
  const recognizeWithGoogleSpeech = async (audioUri) => {
    try {
      // Verificar URI válido
      if (!audioUri || typeof audioUri !== 'string') {
        throw new Error('URI de audio inválido');
      }
      
      // Verificar que exista el archivo
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists || fileInfo.size < 1000) {
        throw new Error('Archivo de audio no válido');
      }
      
      // Cargar archivo de audio como Base64
      const audioFile = await FileSystem.readAsStringAsync(audioUri, { 
        encoding: FileSystem.EncodingType.Base64 
      });
      
      // Preparar petición a Google Speech-to-Text
      const response = await fetch('https://speech.googleapis.com/v1/speech:recognize?key=AIzaSyDGqyJR4KZRJt9qRLmeGjdlgIBt_nb7Kqw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'AMR',
            sampleRateHertz: 8000,
            languageCode: 'es-ES',
            model: 'command_and_search',
            speechContexts: [{
              phrases: [ACTIVATION_KEYWORD],
              boost: 20
            }]
          },
          audio: {
            content: audioFile,
          },
        }),
      });
      
      // Procesar respuesta
      const data = await response.json();
      
      // Extraer texto reconocido
      if (data.results && data.results.length > 0) {
        const recognizedText = data.results[0].alternatives[0].transcript;
        return recognizedText;
      } else {
        return '';
      }
    } catch (error) {
      addDebugMessage(`Error en reconocimiento: ${error.message}`);
      return '';
    }
  };
  
  // No renderizar interfaz visible en modo producción
  return null;
};

// Exportar componente
export default VoiceListener;

// Añadir configuración para activar el modo manos libres
export const enableHandsFreeMode = async (taskId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('Usuario no autenticado');
    }
    
    // Llamar a la API para activar el modo manos libres
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/tasks/${taskId}/hands-free`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al activar modo manos libres');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error en enableHandsFreeMode:', error);
    throw error;
  }
};
