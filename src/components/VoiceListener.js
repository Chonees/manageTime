import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constantes para configuración
const LISTENING_INTERVAL = 2000; // Intervalo de escucha en ms (2 segundos)
const LISTENING_DURATION = 3000; // Duración de cada escucha en ms (3 segundos)
const ACTIVATION_KEYWORD = 'hola'; // Palabra clave de activación

const recordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

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
  const noteRecordingTimeoutRef = useRef(null);
  
  // Para debug
  const addDebugMessage = (message) => {
    console.log(`[VoiceListener] ${message}`);
    setDebugMessages(prev => [message, ...prev.slice(0, 9)]);
  };
  
  // Asegurarse de que no hay grabaciones activas
  const ensureNoActiveRecordings = async () => {
    try {
      if (recordingRef.current) {
        addDebugMessage("Eliminando grabación anterior");
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (err) {
          // Ignorar errores al detener, puede que ya no esté activa
        }
        recordingRef.current = null;
      }
      
      // Limpiar cualquier timeout pendiente
      if (noteRecordingTimeoutRef.current) {
        clearTimeout(noteRecordingTimeoutRef.current);
        noteRecordingTimeoutRef.current = null;
      }
    } catch (error) {
      addDebugMessage(`Error limpiando grabaciones: ${error.message}`);
    }
  };
  
  // Inicializar el sistema de escucha
  useEffect(() => {
    // Solo activar si hay una tarea activa
    if (isTaskActive) {
      startListeningCycle();
      addDebugMessage('Iniciando sistema de escucha continua para tareas');
      
      // Informar brevemente al usuario
      Speech.speak("Sistema de voz activado. Diga hola para tomar notas.", {
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
  const startListeningCycle = async () => {
    try {
      // Verificar permisos
      const { status } = await Audio.requestPermissionsAsync();
      addDebugMessage(`Estado de permisos: ${status}`);
      
      if (status !== 'granted') {
        addDebugMessage('Permisos de audio denegados');
        return;
      }
      
      // Detener cualquier escucha previa
      stopListeningCycle();
      
      // Limpiar grabaciones previas
      await ensureNoActiveRecordings();
      
      // Iniciar ciclo de escucha
      addDebugMessage('Ciclo de escucha iniciado');
      intervalTimerRef.current = setInterval(() => {
        // Si ya hay una escucha activa, no iniciar otra
        if (isListening || recordingRef.current) {
          return;
        }
        
        // Iniciar escucha para palabra clave
        startListeningForKeyword();
      }, LISTENING_INTERVAL); // Verificar cada LISTENING_INTERVAL segundos si podemos iniciar una nueva escucha
    } catch (error) {
      addDebugMessage(`Error iniciando ciclo de escucha: ${error.message}`);
    }
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
      await recording.prepareToRecordAsync(recordingOptions);
      
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
        processKeywordRecording();
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
  
  // Procesar grabación de palabra clave
  const processKeywordRecording = async () => {
    try {
      if (!recordingRef.current) {
        addDebugMessage('No hay grabación activa para procesar palabra clave');
        startListeningCycle();
        return;
      }
      
      // Detener la grabación
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (stopError) {
        addDebugMessage(`Error al detener grabación de palabra clave: ${stopError.message}`);
      }
      
      // Obtener URI de la grabación
      let audioUri = null;
      try {
        audioUri = recordingRef.current.getURI();
      } catch (uriError) {
        addDebugMessage(`Error obteniendo URI de palabra clave: ${uriError.message}`);
      }
      
      // Limpiar la referencia a la grabación
      recordingRef.current = null;
      setIsListening(false);
      
      // Si no tenemos URI válido, reiniciar ciclo
      if (!audioUri) {
        addDebugMessage('No se pudo obtener URI de audio para palabra clave');
        startListeningCycle();
        return;
      }
      
      // Reconocer texto
      try {
        const recognizedText = await recognizeWithGoogleSpeech(audioUri);
        addDebugMessage(`Texto reconocido: "${recognizedText || 'vacío'}"`);
        
        // Comprobar si incluye la palabra clave
        const includesKeyword = recognizedText && 
                               recognizedText.toLowerCase().includes(ACTIVATION_KEYWORD.toLowerCase());
        
        addDebugMessage(`ACTIVATION_KEYWORD: "${ACTIVATION_KEYWORD}"`);
        addDebugMessage(`Incluye palabra clave: ${includesKeyword}`);
        
        if (includesKeyword) {
          addDebugMessage('¡PALABRA CLAVE DETECTADA! Iniciando flujo de notas.');
          // Detiene cualquier ciclo de escucha que pueda estar activo
          stopListeningCycle();
          
          // Iniciar el flujo de notas
          await handleNoteTaking();
        } else {
          // Sin palabra clave, mostrar el texto reconocido y continuar escuchando
          addDebugMessage(`Texto reconocido (sin palabra clave): "${recognizedText || 'vacío'}"`);
          startListeningCycle();
        }
      } catch (error) {
        addDebugMessage(`Error reconociendo texto de palabra clave: ${error.message}`);
        startListeningCycle();
      }
    } catch (error) {
      addDebugMessage(`Error general procesando palabra clave: ${error.message}`);
      recordingRef.current = null;
      setIsListening(false);
      startListeningCycle();
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
  
  // Manejar todo el flujo de toma de notas
  const handleNoteTaking = async () => {
    try {
      // Pausar el ciclo de escucha mientras se usa el asistente
      stopListeningCycle();
      
      // Asegurar que no hay grabaciones activas
      await ensureNoActiveRecordings();
      
      // 1. Verificar tarea activa
      addDebugMessage('Verificando tarea activa...');
      
      // La tarea ya debe estar activa para que este componente funcione
      if (!isTaskActive || !taskData) {
        // Usar onDone para esperar a que termine de hablar
        await new Promise((resolve) => {
          Speech.speak("No hay tarea activa. Por favor, activa una tarea primero.", {
            language: 'es-ES',
            pitch: 1.0,
            rate: 0.9,
            onDone: resolve
          });
        });
        
        setTimeout(() => startListeningCycle(), 1000);
        return;
      }
      
      // FLUJO ULTRA SIMPLIFICADO:
      // Solo decir "Te escucho" y esperar a que termine
      await new Promise((resolve) => {
        Speech.speak("Te escucho", { 
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9,
          onDone: resolve 
        });
      });
      
      // Pausa más larga antes de iniciar la grabación
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Comenzar a escuchar la nota (sin anuncios de voz que interfieran)
      await startListeningForNote();
      
    } catch (error) {
      addDebugMessage(`Error en flujo de notas: ${error.message}`);
      await ensureNoActiveRecordings();
      startListeningCycle();
    }
  };
  
  // Comenzar a escuchar específicamente para la nota
  const startListeningForNote = async () => {
    try {
      addDebugMessage('INICIANDO GRABACIÓN PARA NOTA');
      
      // Asegurar que no hay grabaciones activas
      await ensureNoActiveRecordings();
      
      // Configurar la grabación
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(recordingOptions);
      
      // Guardar la referencia a la grabación
      recordingRef.current = recording;
      
      // Iniciar la grabación silenciosamente - sin anuncios de voz
      await recording.startAsync();
      addDebugMessage('Grabación de nota INICIADA - espere 6 segundos');
      setIsListening(true);
      
      // Programar la detención de la grabación después de 6 segundos
      noteRecordingTimeoutRef.current = setTimeout(() => {
        addDebugMessage('Tiempo de grabación de nota completado');
        processNoteRecording();
      }, 6000);
    } catch (error) {
      addDebugMessage(`Error iniciando grabación de nota: ${error.message}`);
      recordingRef.current = null;
      startListeningCycle();
    }
  };
  
  // Procesar específicamente la grabación de la nota
  const processNoteRecording = async () => {
    addDebugMessage('Procesando grabación de nota...');
    
    try {
      // Si no hay grabación activa, salir
      if (!recordingRef.current) {
        addDebugMessage('No hay grabación activa para procesar');
        startListeningCycle();
        return;
      }
      
      // Detener la grabación
      try {
        await recordingRef.current.stopAndUnloadAsync();
        addDebugMessage('Grabación detenida correctamente');
      } catch (stopError) {
        addDebugMessage(`Error al detener grabación: ${stopError.message}`);
        recordingRef.current = null;
        setIsListening(false);
        startListeningCycle();
        return;
      }
      
      // Obtener URI de la grabación
      let audioUri = null;
      try {
        audioUri = recordingRef.current.getURI();
        
        // Verificar que el archivo exista
        if (audioUri) {
          const fileInfo = await FileSystem.getInfoAsync(audioUri);
          
          if (!fileInfo.exists) {
            addDebugMessage('El archivo de audio no existe');
            audioUri = null;
          }
        }
      } catch (uriError) {
        addDebugMessage(`Error obteniendo URI: ${uriError.message}`);
        audioUri = null;
      }
      
      // Limpiar la referencia a la grabación
      recordingRef.current = null;
      setIsListening(false);
      
      // Si no tenemos URI válido, reiniciar ciclo
      if (!audioUri) {
        addDebugMessage('No se pudo obtener URI de audio válido');
        startListeningCycle();
        return;
      }
      
      // Procesar audio con Google Speech-to-Text
      try {
        addDebugMessage('Enviando audio a Google Speech-to-Text...');
        const noteText = await recognizeWithGoogleSpeech(audioUri);
        addDebugMessage(`Nota reconocida: "${noteText || 'vacío'}"`);
        
        // Enviar la nota al backend
        if (noteText && noteText.trim().length > 0) {
          addDebugMessage('Simulando guardado de nota...');
          
          // Decir que se ha entendido la nota y esperar a que termine
          await new Promise((resolve) => {
            Speech.speak(`¿Es correcto el mensaje: ${noteText}? Diga sí o no.`, {
              language: 'es-ES',
              pitch: 1.0,
              rate: 0.9,
              onDone: resolve
            });
          });
          
          // Guardar la nota temporalmente
          setLastRecognizedText(noteText);
          
          // Tiempo de espera breve de 1 segundo como solicitado por el usuario
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Activar escucha para confirmación
          await startListeningForConfirmation(noteText);
        } else {
          addDebugMessage('No se reconoció ninguna nota, reiniciando ciclo');
          
          await new Promise((resolve) => {
            Speech.speak("No he podido entender su nota. Por favor, intente de nuevo.", {
              language: 'es-ES',
              pitch: 1.0,
              rate: 0.9,
              onDone: resolve
            });
          });
          
          // Pequeña pausa antes de reiniciar
          await new Promise(resolve => setTimeout(resolve, 3000));
          setTimeout(() => startListeningCycle(), 1000);
        }
      } catch (error) {
        addDebugMessage(`Error procesando audio: ${error.message}`);
        
        await new Promise((resolve) => {
          Speech.speak("Ha ocurrido un error. Reiniciando el sistema.", {
            language: 'es-ES',
            pitch: 1.0,
            rate: 0.9,
            onDone: resolve
          });
        });
        
        setTimeout(() => startListeningCycle(), 3000);
      }
    } catch (error) {
      addDebugMessage(`Error general en processNoteRecording: ${error.message}`);
      
      await new Promise((resolve) => {
        Speech.speak("Ha ocurrido un error. Reiniciando el sistema.", {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9,
          onDone: resolve
        });
      });
      
      setTimeout(() => startListeningCycle(), 3000);
    }
  };
  
  // Comenzar a escuchar específicamente para la confirmación
  const startListeningForConfirmation = async (noteText) => {
    try {
      addDebugMessage('INICIANDO GRABACIÓN PARA CONFIRMACIÓN');
      
      // Asegurar que no hay grabaciones activas
      await ensureNoActiveRecordings();
      
      // Configurar la grabación
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(recordingOptions);
      
      // Guardar la referencia a la grabación
      recordingRef.current = recording;
      
      // Iniciar la grabación directamente - sin anuncios ni pausas adicionales
      // Ya se ha esperado 5 segundos después de preguntar
      await recording.startAsync();
      addDebugMessage('Grabación de confirmación INICIADA - espere 3 segundos');
      setIsListening(true);
      
      // Programar la detención de la grabación después de 3 segundos
      noteRecordingTimeoutRef.current = setTimeout(() => {
        addDebugMessage('Tiempo de grabación de confirmación completado');
        processConfirmationRecording(noteText);
      }, 3000);
    } catch (error) {
      addDebugMessage(`Error iniciando grabación de confirmación: ${error.message}`);
      recordingRef.current = null;
      startListeningCycle();
    }
  };
  
  // Procesar específicamente la grabación de la confirmación
  const processConfirmationRecording = async (noteText) => {
    addDebugMessage('Procesando grabación de confirmación...');
    
    try {
      // Si no hay grabación activa, salir
      if (!recordingRef.current) {
        addDebugMessage('No hay grabación activa para procesar confirmación');
        startListeningCycle();
        return;
      }
      
      // Detener la grabación
      try {
        await recordingRef.current.stopAndUnloadAsync();
        addDebugMessage('Grabación de confirmación detenida correctamente');
      } catch (stopError) {
        addDebugMessage(`Error al detener grabación de confirmación: ${stopError.message}`);
        recordingRef.current = null;
        setIsListening(false);
        startListeningCycle();
        return;
      }
      
      // Obtener URI de la grabación
      let audioUri = null;
      try {
        audioUri = recordingRef.current.getURI();
        
        // Verificar que el archivo exista
        if (audioUri) {
          const fileInfo = await FileSystem.getInfoAsync(audioUri);
          
          if (!fileInfo.exists) {
            addDebugMessage('El archivo de audio de confirmación no existe');
            audioUri = null;
          }
        }
      } catch (uriError) {
        addDebugMessage(`Error obteniendo URI de confirmación: ${uriError.message}`);
        audioUri = null;
      }
      
      // Limpiar la referencia a la grabación
      recordingRef.current = null;
      setIsListening(false);
      
      // Si no tenemos URI válido, reiniciar ciclo
      if (!audioUri) {
        addDebugMessage('No se pudo obtener URI de audio de confirmación válido');
        startListeningCycle();
        return;
      }
      
      // Procesar audio con Google Speech-to-Text
      try {
        addDebugMessage('Enviando audio a Google Speech-to-Text...');
        const confirmationText = await recognizeWithGoogleSpeech(audioUri);
        addDebugMessage(`Confirmación reconocida: "${confirmationText || 'vacío'}"`);
        
        // Lista de frases del propio sistema que debemos ignorar (ampliada)
        const systemPhrases = [
          "dicte su nota",
          "por favor dicte",
          "diga sí o no",
          "es correcto el mensaje",
          "grabando",
          "beep",
          "después del tono",
          "prepárese para",
          "dicte su",
          "nota ahora"
        ];
        
        // Verificar si la respuesta contiene frases del sistema con una verificación más estricta
        const lowerConfirmation = confirmationText ? confirmationText.toLowerCase() : '';
        
        // Comprobar si el texto incluye alguna de las frases del sistema
        const isSystemResponse = systemPhrases.some(phrase => 
          lowerConfirmation.includes(phrase.toLowerCase())
        );
        
        addDebugMessage(`¿Es respuesta del sistema? ${isSystemResponse ? 'SÍ' : 'NO'}`);
        
        if (isSystemResponse) {
          addDebugMessage('⚠️ Detectada respuesta del propio sistema - intentando nuevamente');
          
          await new Promise((resolve) => {
            Speech.speak("No escuché su respuesta. Diga sí para guardar o no para cancelar.", {
              language: 'es-ES',
              pitch: 1.0,
              rate: 0.9,
              onDone: resolve
            });
          });
          
          // Pausa mucho más larga para asegurar que no se auto-escuche
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Intentar escuchar de nuevo para confirmación
          await startListeningForConfirmation(noteText);
          return;
        }
        
        // Verificación de sí/no más clara y directa
        if (confirmationText && lowerConfirmation) {
          // Búsqueda más específica de "sí" o variantes
          const isYes = lowerConfirmation.includes('sí') || 
                        lowerConfirmation.includes('si ') || 
                        lowerConfirmation.includes(' si') ||
                        lowerConfirmation === 'si';
          
          // Búsqueda más específica de "no" o variantes
          const isNo = lowerConfirmation.includes(' no ') || 
                       lowerConfirmation.startsWith('no ') ||
                       lowerConfirmation.endsWith(' no') ||
                       lowerConfirmation === 'no';
          
          addDebugMessage(`Análisis de confirmación: isYes=${isYes}, isNo=${isNo}`);
          
          if (isYes) {
            addDebugMessage('Confirmación "sí" detectada - guardando nota');
            await saveNote(noteText);
          } else if (isNo) {
            addDebugMessage('Confirmación "no" detectada - cancelando nota');
            await new Promise((resolve) => {
              Speech.speak("Nota cancelada.", {
                language: 'es-ES',
                pitch: 1.0,
                rate: 0.9,
                onDone: resolve
              });
            });
            setTimeout(() => startListeningCycle(), 1000);
          } else {
            addDebugMessage('Confirmación no clara, repitiendo pregunta');
            
            await new Promise((resolve) => {
              Speech.speak(`No entendí. Responda simplemente sí o no.`, {
                language: 'es-ES',
                pitch: 1.0,
                rate: 0.9,
                onDone: resolve
              });
            });
            
            // Pequeña pausa antes de escuchar de nuevo
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            // Intentar escuchar de nuevo para confirmación
            setTimeout(() => startListeningForConfirmation(noteText), 1000);
            return;
          }
        } else {
          addDebugMessage('No se reconoció confirmación, reiniciando ciclo');
          
          await new Promise((resolve) => {
            Speech.speak("No pude entender su respuesta. Reiniciando asistente.", {
              language: 'es-ES',
              pitch: 1.0,
              rate: 0.9,
              onDone: resolve
            });
          });
          
          setTimeout(() => startListeningCycle(), 1000);
        }
      } catch (error) {
        addDebugMessage(`Error procesando audio de confirmación: ${error.message}`);
        
        await new Promise((resolve) => {
          Speech.speak("Ha ocurrido un error. Reiniciando el sistema.", {
            language: 'es-ES',
            pitch: 1.0,
            rate: 0.9,
            onDone: resolve
          });
        });
        
        setTimeout(() => startListeningCycle(), 1000);
      }
    } catch (error) {
      addDebugMessage(`Error general en processConfirmationRecording: ${error.message}`);
      setTimeout(() => startListeningCycle(), 1000);
    }
  };
  
  // Guardar la nota usando la API exactamente como lo hace VoiceAssistantSimulator
  const saveNote = async (noteText) => {
    try {
      addDebugMessage('Guardando nota en el backend...');
      
      await new Promise((resolve) => {
        Speech.speak("Guardando nota...", {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9,
          onDone: resolve
        });
      });
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      // Extraer ID de tarea
      const taskId = taskData._id || taskData.id;
      
      if (!taskId) {
        throw new Error('ID de tarea no válido');
      }
      
      addDebugMessage(`Guardando nota para tarea ID: ${taskId}`);
      
      // Construir URL directamente con el endpoint correcto (igual que en el simulador)
      const url = `https://managetime-backend-48f256c2dfe5.herokuapp.com/api/tasks/${taskId}/note`;
      addDebugMessage(`URL para guardar nota: ${url}`);
      
      // Crear opciones exactamente iguales a las del simulador
      const options = {
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
      };
      
      addDebugMessage(`Opciones de la petición: ${JSON.stringify(options, null, 2)}`);
      
      // Realizar petición exactamente como en el simulador
      const response = await fetch(url, options);
      addDebugMessage(`Respuesta del servidor: ${response.status}`);
      
      // Manejar errores igual que en el simulador
      if (!response.ok) {
        const errorText = await response.text();
        addDebugMessage(`Error del servidor: ${errorText}`);
        throw new Error(`Error al guardar nota de voz: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      addDebugMessage(`Nota guardada con éxito: ${JSON.stringify(data, null, 2)}`);
      
      // Confirmar guardado
      await new Promise((resolve) => {
        Speech.speak("Nota guardada correctamente.", {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9,
          onDone: resolve
        });
      });
      
      addDebugMessage('Nota guardada correctamente');
      
      // Reiniciar ciclo de escucha después de un breve retraso
      setTimeout(() => startListeningCycle(), 1000);
      
    } catch (error) {
      addDebugMessage(`Error al guardar nota: ${error.message}`);
      
      await new Promise((resolve) => {
        Speech.speak("Hubo un error al guardar la nota. Intente nuevamente.", {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9,
          onDone: resolve
        });
      });
      
      // Reiniciar ciclo de escucha después de un breve retraso
      setTimeout(() => startListeningCycle(), 3000);
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
