import React, { useState, useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';

// Cargar el archivo de audio para que esté disponible
const audioFile = require('../assets/sounds/micro.mp3');

// Configuración simplificada para iOS
const CONFIG_IOS = {
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true
};

// Configuración simplificada de grabación
const recordingOptions = {
  android: {
    extension: '.wav',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.wav', 
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    audioBitsPerSecond: 128000
  }
};

const VoiceListener = ({ isTaskActive = false, taskData = null, onKeywordDetected }) => {
  // Referencias y estados
  const [isListening, setIsListening] = useState(false);
  const recordingRef = useRef(null);
  const timeoutRef = useRef(null);
  const keywordsRef = useRef([]); // Referencia para guardar las palabras clave
  const currentTaskIdRef = useRef(null); // Referencia para guardar el ID de la tarea actual
  const [audioUri, setAudioUri] = useState(null);
  const savedNotesRef = useRef(new Set()); // Referencia para guardar las notas guardadas

  // Para mostrar mensajes de debug en la consola
  const logDebug = (message) => {
    console.log(`[VoiceListener] ${message}`);
  };

  // Función para extraer palabras clave de la tarea
  const extractKeywordsFromTask = (task) => {
    if (!task) {
      logDebug('No hay datos de tarea para extraer palabras clave');
      return [];
    }

    logDebug(`Extrayendo palabras clave de tarea: ${JSON.stringify(task, null, 2)}`);
    
    // Verificar si tiene handsFreeMode y keywords
    if (task.handsFreeMode && task.keywords) {
      logDebug(`Tarea tiene handsFreeMode=${task.handsFreeMode} y keywords="${task.keywords}"`);
      
      // Si keywords es un string no vacío, procesarlo
      if (typeof task.keywords === 'string' && task.keywords.trim().length > 0) {
        const keywordsList = task.keywords
          .split(',')
          .map(word => word.trim().toLowerCase())
          .filter(word => word.length > 0);
        
        // Procesar también palabras individuales de frases más largas
        const individualWords = keywordsList.reduce((acc, phrase) => {
          // Dividir por espacios y filtrar palabras muy cortas
          const words = phrase.split(' ').filter(w => w.length > 2);
          return [...acc, ...words];
        }, []);
        
        // Combinar frases y palabras individuales, eliminando duplicados
        const combinedKeywords = [...new Set([...keywordsList, ...individualWords])];
        
        logDebug(`Palabras clave extraídas de la tarea: ${JSON.stringify(combinedKeywords)}`);
        return combinedKeywords;
      }
      
      // Si keywords es un array, usarlo directamente
      if (Array.isArray(task.keywords) && task.keywords.length > 0) {
        const keywordsList = task.keywords.map(k => k.toLowerCase());
        logDebug(`Palabras clave (array) extraídas de la tarea: ${JSON.stringify(keywordsList)}`);
        return keywordsList;
      }
    }
    
    logDebug('No se encontraron keywords válidas en la tarea');
    return [];
  };

  // Efecto que se ejecuta cuando la tarea cambia
  useEffect(() => {
    // Solo activar si hay una tarea activa
    if (isTaskActive && taskData) {
      logDebug('==================================================');
      logDebug('Tarea activa detectada - Iniciando sistema de escucha');
      
      // Extraer y configurar las palabras clave de la tarea
      const extractedKeywords = extractKeywordsFromTask(taskData);
      keywordsRef.current = extractedKeywords;
      
      // Guardar el ID de la tarea actual
      currentTaskIdRef.current = taskData._id || taskData.id;
      
      logDebug(`Palabras clave configuradas para reconocimiento: ${JSON.stringify(extractedKeywords)}`);
      logDebug('==================================================');
      
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

  // Iniciar el ciclo de escucha - versión simplificada
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
      
      // Programar para detener (4 segundos para dar más tiempo a hablar)
      timeoutRef.current = setTimeout(() => {
        processRecording();
      }, 4000);
      
    } catch (error) {
      logDebug(`Error en ciclo de escucha: ${error.message}`);
      // Reintentar después de un error
      timeoutRef.current = setTimeout(startListeningCycle, 500);
    }
  };

  // Iniciar grabación con Audio - versión simplificada
  const startRecording = async () => {
    try {
      // Resetear el objeto de grabación
      if (recordingRef.current) {
        recordingRef.current = null;
      }
      
      logDebug('Iniciando grabación de audio...');
      
      // Configuración básica del audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      // Iniciar la grabación con la configuración
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();
      
      logDebug('Grabación iniciada correctamente');
      recordingRef.current = recording;
      
    } catch (error) {
      logDebug(`Error al iniciar grabación: ${error.message}`);
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

  // Detener la grabación y obtener el archivo
  const stopRecording = async () => {
    try {
      if (!recordingRef.current) {
        logDebug('No hay grabación activa para detener');
        return null;
      }
      
      logDebug('Deteniendo grabación...');
      await recordingRef.current.stopAndUnloadAsync();
      
      const uri = recordingRef.current.getURI();
      logDebug(`Grabación completada, archivo guardado en: ${uri}`);
      
      // Verificar tamaño del archivo
      const fileInfo = await FileSystem.getInfoAsync(uri);
      logDebug(`Archivo de audio: existe=${fileInfo.exists}, tamaño=${fileInfo.size} bytes`);
      
      if (fileInfo.size < 1000) {
        logDebug('⚠️ ADVERTENCIA: El archivo de audio es muy pequeño. Posible problema con el micrófono.');
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      recordingRef.current = null;
      return uri;
      
    } catch (error) {
      logDebug(`Error al detener grabación: ${error.message}`);
      return null;
    }
  };

  // Procesar una grabación
  const processRecording = async () => {
    try {
      // Detener grabación y obtener URI
      const audioUri = await stopRecording();
      if (!audioUri) {
        logDebug('No se pudo obtener el audio grabado');
        timeoutRef.current = setTimeout(startListeningCycle, 500);
        return;
      }
      
      // Verificar si hay keywords para reconocer
      if (!keywordsRef.current || keywordsRef.current.length === 0) {
        logDebug('No hay palabras clave configuradas para reconocimiento');
        timeoutRef.current = setTimeout(startListeningCycle, 500);
        return;
      }
      
      logDebug(`[VoiceListener] Palabras clave para reconocimiento: ${JSON.stringify(keywordsRef.current)}`);
      
      // Realizar reconocimiento
      const recognizedText = await recognizeWithGoogleSpeech(audioUri, keywordsRef.current);
      logDebug(`[VoiceListener] Texto reconocido: "${recognizedText || 'vacío'}"`);
      
      // Verificar si se detectó alguna palabra clave
      let keywordDetected = false;
      
      // Convertir a minúsculas para comparación insensible a mayúsculas/minúsculas
      const lowerText = (recognizedText || '').toLowerCase().trim();
      
      if (lowerText) {
        // Buscar coincidencias con palabras clave
        for (const keyword of keywordsRef.current) {
          const lowerKeyword = keyword.toLowerCase().trim();
          if (lowerText.includes(lowerKeyword)) {
            logDebug(`[VoiceListener] ✅ Palabra clave detectada: "${keyword}"`);
            keywordDetected = true;
            
            // Notificar que se detectó una palabra clave
            if (typeof onKeywordDetected === 'function') {
              logDebug(`[VoiceListener] Notificando detección de palabra clave: "${keyword}"`);
              onKeywordDetected(keyword);
            }
            
            // Guardar como nota para la tarea actual
            const noteText = recognizedText;
            if (!savedNotesRef.current.has(noteText)) {
              await saveNote(noteText, currentTaskIdRef.current, keyword);
              savedNotesRef.current.add(noteText);
            }
            break;
          }
        }
        
        if (!keywordDetected) {
          logDebug(`[VoiceListener] ❌ No se detectó ninguna palabra clave en: "${recognizedText}"`);
        }
      } else {
        logDebug('[VoiceListener] No se reconoció ningún texto en el audio');
      }
      
      // Continuar el ciclo
      timeoutRef.current = setTimeout(startListeningCycle, 500);
      
    } catch (error) {
      logDebug(`Error al procesar grabación: ${error.message}`);
      timeoutRef.current = setTimeout(startListeningCycle, 500);
    }
  };

  // Reconocimiento de voz con Google Speech-to-Text
  const recognizeWithGoogleSpeech = async (audioUri, keywords) => {
    try {
      logDebug('Iniciando reconocimiento de voz para audio: ' + audioUri);
      
      // Convertir audio a Base64
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, { 
        encoding: FileSystem.EncodingType.Base64 
      });
      
      logDebug('Audio convertido a Base64, longitud: ' + audioBase64.length);
      
      // Configuración probada y validada para reconocimiento efectivo
      const requestBody = {
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'es-ES',
          model: 'command_and_search',
          enableAutomaticPunctuation: true,
          useEnhanced: true,
          profanityFilter: false,
          speechContexts: [{
            phrases: keywords,
            boost: 25  // Boost alto para mejorar reconocimiento de palabras clave
          }],
          metadata: {
            interactionType: 'VOICE_COMMAND',
            microphoneDistance: 'NEARFIELD'
          },
          alternativeLanguageCodes: ['es-MX', 'es-AR', 'es-CO'],
        },
        audio: {
          content: audioBase64,
        },
      };
      
      logDebug(`Enviando a Google Speech con ${keywords.length} palabras clave: ${keywords.join(', ')}`);
      
      // Enviar a Google Speech API
      const response = await fetch('https://speech.googleapis.com/v1/speech:recognize?key=AIzaSyDGqyJR4KZRJt9qRLmeGjdlgIBt_nb7Kqw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      // Log más detallado para diagnóstico
      if (data.error) {
        logDebug(`❌ Error en respuesta: ${JSON.stringify(data.error)}`);
      } else if (data.results && data.results.length > 0) {
        logDebug(`✅ Respuesta exitosa: ${JSON.stringify(data.results)}`);
      } else {
        logDebug(`⚠️ No hay resultados: ${JSON.stringify(data)}`);
      }
      
      // Ya no hay simulación, solo reconocimiento real
      if (data && data.results && data.results.length > 0) {
        const recognizedText = data.results[0].alternatives[0].transcript;
        logDebug(`Google reconoció: "${recognizedText}"`);
        return recognizedText;
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
      
      // Esperar 1 segundo y luego limpiar
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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

  // Guardar nota en el backend
  const saveNote = async (noteText, taskId = null, detectedKeyword = null) => {
    try {
      // Usar el taskId que se pasa como parámetro o el almacenado en la referencia
      const targetTaskId = taskId || currentTaskIdRef.current;
      
      if (!targetTaskId) {
        logDebug('No hay ID de tarea para guardar la nota');
        return;
      }
      
      logDebug(`Guardando nota para tarea ${targetTaskId}: "${noteText}"`);
      if (detectedKeyword) {
        logDebug(`Palabra clave detectada: "${detectedKeyword}"`);
      }
      
      // Obtener token de autenticación
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        logDebug('No hay token de autenticación para guardar la nota');
        return;
      }
      
      // Datos de la nota
      const noteData = {
        text: noteText,
        type: 'voice_note',
        timestamp: new Date().toISOString(),
        // Incluir la palabra clave detectada en los datos de la nota
        keyword: detectedKeyword || ''
      };
      
      // URL directa al endpoint
      const url = `https://managetime-backend-48f256c2dfe5.herokuapp.com/api/tasks/${targetTaskId}/note`;
      
      // Enviar la nota al backend
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(noteData)
      });
      
      if (response.ok) {
        logDebug('✅ Nota guardada exitosamente');
        // Vibrar para notificar
        Vibration.vibrate(200);
        // Reproducir sonido de confirmación
        await playPrerecordedAudio('micro.mp3');
      } else {
        const error = await response.text();
        logDebug(`❌ Error al guardar nota: ${error}`);
      }
      
    } catch (error) {
      logDebug(`Error al guardar nota: ${error.message}`);
    }
  };

  // Este componente no renderiza nada visible
  return null;
};

export default VoiceListener;