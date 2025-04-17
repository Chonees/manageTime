import React, { useState, useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';

// Cargar el archivo de audio para que esté disponible
const audioFile = require('../assets/sounds/micro.mp3');

// Palabras clave predeterminadas como respaldo
const DEFAULT_KEYWORDS = ["tanques", "gas", "petroleo"];

// Configuración simplificada para iOS
const CONFIG_IOS = {
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true
};

// Opciones simplificadas para grabación en iOS
const recordingOptions = {
  ios: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  android: {
    extension: '.m4a',
    outputFormat: 2,
    audioEncoder: 3,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  }
};

const VoiceListener = ({ isTaskActive = false, taskData = null }) => {
  // Referencias y estados
  const [isListening, setIsListening] = useState(false);
  const recordingRef = useRef(null);
  const timeoutRef = useRef(null);
  const [taskKeywords, setTaskKeywords] = useState([]);

  // Para mostrar mensajes de debug en la consola
  const logDebug = (message) => {
    console.log(`[VoiceListener] ${message}`);
  };

  // Efecto que se ejecuta cuando la tarea cambia
  useEffect(() => {
    // Solo activar si hay una tarea activa
    if (isTaskActive && taskData) {
      logDebug('Tarea activa detectada - Iniciando sistema de escucha');
      logDebug(`Datos de la tarea recibidos: ${JSON.stringify(taskData, null, 2)}`);
      
      // Extraer palabras clave específicas de la tarea si existen
      if (taskData.handsFreeMode) {
        logDebug(`La tarea tiene modo manos libres activado`);
        
        if (taskData.keywords) {
          logDebug(`Palabras clave de la tarea encontradas: ${taskData.keywords}`);
          
          // Convertir el string de palabras clave a un array
          let keywords = [];
          if (typeof taskData.keywords === 'string') {
            keywords = taskData.keywords
              .split(',')
              .map(word => word.trim().toLowerCase())
              .filter(word => word.length > 0);
          } else if (Array.isArray(taskData.keywords)) {
            keywords = taskData.keywords.map(word => word.toLowerCase());
          }
          
          if (keywords.length > 0) {
            setTaskKeywords(keywords);
            logDebug(`Palabras clave específicas configuradas: ${keywords.join(', ')}`);
          } else {
            logDebug(`No se encontraron palabras clave válidas en la tarea, usando predeterminadas`);
            setTaskKeywords(DEFAULT_KEYWORDS);
          }
        } else {
          logDebug(`No hay campo keywords en la tarea, usando palabras clave predeterminadas`);
          setTaskKeywords(DEFAULT_KEYWORDS);
        }
      } else {
        logDebug(`La tarea NO tiene modo manos libres, usando palabras clave predeterminadas`);
        setTaskKeywords(DEFAULT_KEYWORDS);
      }
      
      // Configurar audio (versión ultra simplificada)
      Audio.setAudioModeAsync(CONFIG_IOS).then(() => {
        logDebug('Configuración de audio completada');
        startListeningCycle();
      }).catch(error => {
        logDebug(`Error en configuración de audio: ${error.message}`);
        // Intentar iniciar de todos modos
        startListeningCycle();
      });
      
      // Limpiar al desmontar
      return () => {
        logDebug('Limpiando recursos');
        stopListening();
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    } else {
      logDebug('No hay tarea activa - sistema inactivo');
      stopListening();
    }
  }, [isTaskActive, taskData]);

  // Iniciar el ciclo de escucha - más rápido (1.5 segundos)
  const startListeningCycle = async () => {
    try {
      // Verificar permisos
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        logDebug('Permisos de audio denegados');
        return;
      }

      // Detener cualquier grabación previa
      await stopListening();
      
      // Iniciar una nueva grabación
      await startRecording();
      
      // Programar para detener más rápido (1.5 segundos)
      timeoutRef.current = setTimeout(() => {
        processRecording();
      }, 1500);
      
    } catch (error) {
      logDebug(`Error en ciclo de escucha: ${error.message}`);
      // Reintentar después de un error
      timeoutRef.current = setTimeout(startListeningCycle, 500);
    }
  };

  // Iniciar la grabación
  const startRecording = async () => {
    try {
      // Configuración ultra básica sin propiedades problemáticas
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();
      
      // Guardar referencia y actualizar estado
      recordingRef.current = recording;
      setIsListening(true);
      
    } catch (error) {
      logDebug(`Error al iniciar grabación: ${error.message}`);
      recordingRef.current = null;
      setIsListening(false);
      
      // Reintentar después de un breve retraso
      setTimeout(startListeningCycle, 500);
    }
  };

  // Detener la grabación
  const stopListening = async () => {
    try {
      if (recordingRef.current) {
        logDebug('Deteniendo grabación...');
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      
      setIsListening(false);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } catch (error) {
      logDebug(`Error al detener grabación: ${error.message}`);
      recordingRef.current = null;
    }
  };

  // Procesar la grabación
  const processRecording = async () => {
    try {
      if (!recordingRef.current) {
        logDebug('No hay grabación activa para procesar');
        startListeningCycle();
        return;
      }
      
      // Detener la grabación
      let audioUri = null;
      
      try {
        await recordingRef.current.stopAndUnloadAsync();
        audioUri = recordingRef.current.getURI();
      } catch (stopError) {
        logDebug(`Error deteniendo grabación: ${stopError.message}`);
      }
      
      // Limpiar referencia
      recordingRef.current = null;
      setIsListening(false);
      
      if (!audioUri) {
        logDebug('No se pudo obtener audio válido');
        startListeningCycle();
        return;
      }
      
      // Reconocer voz con Google Speech-to-Text (más rápido)
      const recognizedText = await recognizeWithGoogleSpeech(audioUri);
      logDebug(`Texto reconocido: "${recognizedText || 'vacío'}"`);
      
      if (recognizedText) {
        // Convertir a minúsculas para comparación
        const lowerText = recognizedText.toLowerCase();
        
        // Mostrar las palabras clave que estamos buscando
        logDebug(`Buscando coincidencias con palabras clave: ${JSON.stringify(taskKeywords)}`);
        
        // Buscar palabras clave
        const foundKeywords = taskKeywords.filter(keyword => 
          lowerText.includes(keyword)
        );
        
        if (foundKeywords.length > 0) {
          logDebug(`¡PALABRAS CLAVE DETECTADAS!: ${foundKeywords.join(", ")}`);
          
          // Vibrar para notificar
          Vibration.vibrate(200);
          
          // Guardar en la base de datos
          for (const keyword of foundKeywords) {
            await saveNote(keyword);
          }
          
          // Reproducir sonido después de guardar
          try {
            await playPrerecordedAudio('micro.mp3');
          } catch (audioError) {
            logDebug(`Error reproduciendo sonido: ${audioError.message}`);
          }
        } else {
          logDebug(`No se encontraron coincidencias con las palabras clave configuradas`);
        }
      }
      
      // Continuar el ciclo de escucha inmediatamente - sin esperas adicionales
      startListeningCycle();
      
    } catch (error) {
      logDebug(`Error procesando grabación: ${error.message}`);
      startListeningCycle();
    }
  };

  // Reconocimiento de voz con Google Speech-to-Text - optimizado
  const recognizeWithGoogleSpeech = async (audioUri) => {
    try {
      // Convertir audio a Base64
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, { 
        encoding: FileSystem.EncodingType.Base64 
      });
      
      // Registrar las palabras clave que se usarán para el reconocimiento
      logDebug(`Usando palabras clave para reconocimiento: ${JSON.stringify(taskKeywords)}`);
      
      // Enviar a Google Speech API - optimizado para velocidad
      const response = await fetch('https://speech.googleapis.com/v1/speech:recognize?key=AIzaSyDGqyJR4KZRJt9qRLmeGjdlgIBt_nb7Kqw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'es-ES',
            model: 'command_and_search',
            enableAutomaticPunctuation: false,
            useEnhanced: false,  // Más rápido
            speechContexts: [{
              phrases: taskKeywords,
              boost: 20
            }]
          },
          audio: {
            content: audioBase64,
          },
        }),
      });
      
      const data = await response.json();
      
      if (data && data.results && data.results.length > 0) {
        return data.results[0].alternatives[0].transcript;
      }
      
      return '';
      
    } catch (error) {
      logDebug(`Error en reconocimiento de voz: ${error.message}`);
      return '';
    }
  };

  // Función dedicada para reproducir un archivo de audio pregrabado
  const playPrerecordedAudio = async (filename) => {
    try {
      // Usar solo la configuración mínima que sabemos que funciona
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false
      });
      
      console.log(`[Audio] Reproduciendo ${filename}`);
      
      // Reproducir el audio pregrabado
      const soundObject = new Audio.Sound();
      await soundObject.loadAsync(require('../assets/sounds/micro.mp3'));
      await soundObject.setVolumeAsync(1.0);
      await soundObject.playAsync();
      
      // Esperar 2 segundos y luego limpiar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        await soundObject.unloadAsync();
      } catch (e) {
        // Ignorar errores
      }
      
      // Volver a modo grabación con configuración mínima
      await Audio.setAudioModeAsync(CONFIG_IOS);
      
      return true;
    } catch (e) {
      console.log(`[Audio] Error al reproducir ${filename}: ${e.message}`);
      
      // Volver a modo grabación
      await Audio.setAudioModeAsync(CONFIG_IOS);
      
      return false;
    }
  };

  // saveNote on backend
  const saveNote = async (noteText) => {
    try {
      logDebug(`Guardando nota: ${noteText}`);
      
      // Obtener token de autenticación
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      // Obtener ID de la tarea
      const taskId = taskData._id || taskData.id;
      if (!taskId) {
        throw new Error('ID de tarea no válido');
      }
      
      // URL para la API
      const url = `https://managetime-backend-48f256c2dfe5.herokuapp.com/api/tasks/${taskId}/note`;
      
      // Enviar nota al backend
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          text: noteText, 
          type: 'voice_note',
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }
      
      logDebug('Nota guardada correctamente');
      
    } catch (error) {
      logDebug(`Error guardando nota: ${error.message}`);
    }
  };

  // Este componente no renderiza nada visible
  return null;
};

export default VoiceListener;