import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  Vibration,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useLanguage } from '../context/LanguageContext';

const VERIFICATION_INTERVAL = 10000; // 10 segundos en milisegundos (antes era 600000 - 10 minutos)
const VIBRATION_PATTERN = Platform.OS === 'android' ? [1000, 1000] : [1000, 2000, 1000, 2000]; // Patrón de vibración (vibrar, pausa)
const SPEECH_DELAY = 1000; // Retraso antes de leer el código en voz alta (ms)
const LISTENING_DELAY = 0; // Retraso antes de activar el micrófono (ms)
const LISTENING_TIMEOUT = 10000; // Tiempo máximo de escucha (ms)

// Configuración simplificada para iOS (como en VoiceListener.js)
const CONFIG_IOS = {
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true
};

// Configuración simplificada de grabación (como en VoiceListener.js)
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

// Cambiado de isWorking a isAvailable para reflejar el nuevo enfoque
const VerificationPrompt = ({ isAvailable, onVerificationFailed }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [currentCode, setCurrentCode] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognitionStatus, setRecognitionStatus] = useState('');
  const [recordingAttempts, setRecordingAttempts] = useState(0);
  const MAX_RECORDING_ATTEMPTS = 3;
  const { t, language } = useLanguage();
  
  // Usar useRef en lugar de useState para los timers para evitar re-renderizaciones
  const verificationTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const vibrationIntervalRef = useRef(null);
  const hapticIntervalRef = useRef(null);
  const recordingRef = useRef(null);
  const speechTimerRef = useRef(null);
  const listeningTimerRef = useRef(null);
  const listeningTimeoutRef = useRef(null);

  // Variable para almacenar el último código generado
  let lastGeneratedCode = '';
  
  // Función para obtener el último código generado
  const getLastGeneratedCode = () => {
    return lastGeneratedCode;
  };

  // Función para generar un código aleatorio de 4 dígitos
  const generateRandomCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    lastGeneratedCode = code; // Almacenar el código generado
    return code;
  };

  // Función para agregar información de depuración
  const addDebugInfo = (info) => {
    console.log(`[VerificationPrompt] ${info}`);
  };

  // Limpiar timers cuando el componente se desmonta
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  // Función para limpiar todos los recursos
  const cleanupResources = () => {
    stopVibration();
    stopListening();
    
    if (verificationTimerRef.current) {
      clearTimeout(verificationTimerRef.current);
      verificationTimerRef.current = null;
    }
    
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    
    if (listeningTimerRef.current) {
      clearTimeout(listeningTimerRef.current);
      listeningTimerRef.current = null;
    }
    
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
      listeningTimeoutRef.current = null;
    }
    
    // Detener cualquier síntesis de voz en curso
    try {
      Speech.stop();
    } catch (error) {
      addDebugInfo(`Error al detener síntesis de voz: ${error.message}`);
    }
  };

  // Efecto para manejar la verificación periódica
  useEffect(() => {
    // Limpiar el timer anterior si existe
    if (verificationTimerRef.current) {
      clearTimeout(verificationTimerRef.current);
      verificationTimerRef.current = null;
    }
    
    if (isAvailable && !modalVisible) {
      // Iniciar el timer de verificación cuando el usuario está disponible
      verificationTimerRef.current = setTimeout(() => {
        triggerVerification();
      }, VERIFICATION_INTERVAL);
      
      addDebugInfo(`Timer de verificación iniciado, se activará en ${VERIFICATION_INTERVAL / 1000} segundos`);
    } else if (!isAvailable) {
      // Cerrar el modal si está abierto y el usuario no está disponible
      if (modalVisible) {
        setModalVisible(false);
        cleanupResources();
        setTimeRemaining(30);
      }
    }
  }, [isAvailable, modalVisible]);

  // Iniciar vibración constante
  const startConstantVibration = () => {
    try {
      // Detener cualquier vibración previa
      stopVibration();
      
      // Iniciar vibración con patrón repetitivo
      Vibration.vibrate(VIBRATION_PATTERN, true);
      
      // Usar Haptics cada 2 segundos para reforzar la vibración
      hapticIntervalRef.current = setInterval(() => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (error) {
          addDebugInfo(`Error en haptics interval: ${error.message}`);
        }
      }, 2000);
      
      addDebugInfo('Vibración constante iniciada');
    } catch (error) {
      addDebugInfo(`Error al iniciar vibración constante: ${error.message}`);
    }
  };

  // Detener toda vibración
  const stopVibration = () => {
    try {
      // Cancelar cualquier vibración en curso
      Vibration.cancel();
      
      // Limpiar el intervalo de haptics
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }
      
      addDebugInfo('Vibración detenida');
    } catch (error) {
      addDebugInfo(`Error al detener vibración: ${error.message}`);
    }
  };

  // Programar la siguiente verificación
  const scheduleNextVerification = () => {
    if (verificationTimerRef.current) {
      clearTimeout(verificationTimerRef.current);
    }
    
    addDebugInfo(`Próxima verificación programada para dentro de ${VERIFICATION_INTERVAL / 1000} segundos`);
    
    verificationTimerRef.current = setTimeout(() => {
      if (isAvailable) {
        triggerVerification();
      } else {
        addDebugInfo('Usuario no disponible, no se inicia verificación');
        scheduleNextVerification();
      }
    }, VERIFICATION_INTERVAL);
  };

  // Verificar permisos de audio
  const checkAudioPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      addDebugInfo(`Estado de permisos de audio: ${status}`);
      return status === 'granted';
    } catch (error) {
      addDebugInfo(`Error al verificar permisos de audio: ${error.message}`);
      return false;
    }
  };

  // Función para asegurarse de que no haya grabaciones activas
  const ensureNoActiveRecordings = async () => {
    try {
      // Verificar si hay una grabación activa en nuestro componente
      if (recordingRef.current) {
        addDebugInfo('Deteniendo grabación existente antes de iniciar una nueva');
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (stopError) {
          addDebugInfo(`Error al detener grabación existente: ${stopError.message}`);
        }
        recordingRef.current = null;
      }
      
      // Para Android, simplemente reiniciar el sistema de audio sin configuraciones complejas
      if (Platform.OS === 'android') {
        try {
          // Desactivar completamente el audio
          addDebugInfo('Desactivando completamente el sistema de audio (Android)');
          await Audio.setIsEnabledAsync(false);
          
          // Pausa para asegurar que todo se libere
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Reactivar el audio
          addDebugInfo('Reactivando el sistema de audio (Android)');
          await Audio.setIsEnabledAsync(true);
          
          // Otra pausa para asegurar que el sistema esté listo
          await new Promise(resolve => setTimeout(resolve, 800));
          
          addDebugInfo('Sistema de audio reiniciado completamente (Android)');
          return true;
        } catch (resetError) {
          addDebugInfo(`Error al reiniciar audio en Android: ${resetError.message}`);
          return false;
        }
      } 
      // Para iOS, mantener la configuración completa
      else {
        // Código para iOS...
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            interruptionModeIOS: 1, // Valor numérico en lugar de constante
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false
          });
          addDebugInfo('Modo de audio reiniciado (iOS)');
        } catch (audioModeError) {
          addDebugInfo(`Error al configurar modo de audio en iOS: ${audioModeError.message}`);
        }
        
        return true;
      }
    } catch (error) {
      addDebugInfo(`Error al limpiar grabaciones: ${error.message}`);
      return false;
    }
  };

  // Iniciar reconocimiento de voz
  const startListening = async () => {
    try {
      // Si ya está escuchando, no hacer nada
      if (isListening) {
        addDebugInfo('Ya está escuchando, no se inicia una nueva grabación');
        return;
      }
      
      // Verificar permisos de audio
      const { status } = await Audio.requestPermissionsAsync();
      addDebugInfo(`Estado de permisos de audio: ${status}`);
      
      if (status !== 'granted') {
        addDebugInfo('Permisos de audio denegados');
        return;
      }
      
      // Detener cualquier grabación previa
      await stopListening();
      
      // Configuración básica del audio (simplificada como en VoiceListener.js)
      try {
        addDebugInfo('Configurando modo de audio para grabación...');
        await Audio.setAudioModeAsync(CONFIG_IOS);
        addDebugInfo('Modo de audio configurado correctamente');
      } catch (audioModeError) {
        addDebugInfo(`Error al configurar modo de audio: ${audioModeError.message}`);
      }
      
      try {
        // Crear una nueva instancia de grabación
        addDebugInfo('Creando nueva instancia de grabación...');
        const recording = new Audio.Recording();
        
        // Configuración simplificada para mayor compatibilidad
        addDebugInfo('Preparando grabación con configuración simplificada...');
        await recording.prepareToRecordAsync(recordingOptions);
        
        // Guardar referencia
        recordingRef.current = recording;
        
        // Iniciar grabación
        addDebugInfo('Iniciando grabación...');
        await recording.startAsync();
        addDebugInfo('Grabación iniciada correctamente');
        
        // Actualizar estado
        setIsListening(true);
        setRecognitionStatus('Escuchando...');
        
        // Vibrar para indicar inicio de escucha
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (hapticError) {
          // Ignorar errores de háptica
        }
        
        // Configurar un temporizador para detener la grabación después de un tiempo
        if (listeningTimerRef.current) {
          clearTimeout(listeningTimerRef.current);
        }
        
        // Tiempo de escucha reducido a 4 segundos para mayor rapidez
        listeningTimerRef.current = setTimeout(() => {
          addDebugInfo('Tiempo de escucha completado, procesando entrada...');
          processVoiceInput();
        }, 4000);
        
        return true;
        
      } catch (recordError) {
        addDebugInfo(`Error al iniciar grabación: ${recordError.message}`);
        
        // Intentar una limpieza más agresiva
        if (recordingRef.current) {
          try {
            await recordingRef.current.stopAndUnloadAsync();
          } catch (stopError) {
            // Ignorar errores al detener
          }
          recordingRef.current = null;
        }
        
        return false;
      }
      
    } catch (error) {
      addDebugInfo(`Error general al iniciar reconocimiento de voz: ${error.message}`);
      return false;
    }
  };

  // Detener reconocimiento de voz
  const stopListening = async () => {
    try {
      // Limpiar temporizadores
      if (listeningTimerRef.current) {
        clearTimeout(listeningTimerRef.current);
        listeningTimerRef.current = null;
      }
      
      // Verificar si hay una grabación activa
      if (!recordingRef.current) {
        addDebugInfo('No está escuchando, nada que detener');
        setIsListening(false);
        return null;
      }
      
      // Detener la grabación
      addDebugInfo('Deteniendo grabación...');
      
      let audioUri = null;
      
      try {
        // Detener la grabación
        await recordingRef.current.stopAndUnloadAsync();
        addDebugInfo('Grabación detenida correctamente');
        
        // Obtener URI de la grabación
        try {
          audioUri = recordingRef.current.getURI();
          addDebugInfo(`URI de grabación obtenido: ${audioUri || 'No disponible'}`);
          
          // Verificar que el URI sea válido
          if (audioUri) {
            const fileInfo = await FileSystem.getInfoAsync(audioUri);
            addDebugInfo(`Información del archivo: ${JSON.stringify(fileInfo)}`);
            
            if (!fileInfo.exists) {
              addDebugInfo('El archivo de audio no existe a pesar de tener URI');
              audioUri = null;
            } else {
              addDebugInfo(`Archivo confirmado, tamaño: ${fileInfo.size} bytes`);
            }
          }
        } catch (uriError) {
          addDebugInfo(`Error al obtener o verificar URI: ${uriError.message}`);
          audioUri = null;
        }
      } catch (stopError) {
        addDebugInfo(`Error al detener grabación: ${stopError.message}`);
      }
      
      // Liberar recursos
      recordingRef.current = null;
      
      // Actualizar estado
      setIsListening(false);
      setRecognitionStatus('');
      
      // Retornar URI para procesamiento
      return audioUri;
    } catch (error) {
      addDebugInfo(`Error al detener reconocimiento de voz: ${error.message}`);
      setIsListening(false);
      return null;
    }
  };

  // Procesar entrada de voz
  const processVoiceInput = async () => {
    try {
      // Detener la grabación y obtener el URI
      const audioUri = await stopListening();
      
      if (!audioUri) {
        addDebugInfo('No se obtuvo URI de audio, no se puede procesar');
        return;
      }
      
      setRecognitionStatus('Procesando...');
      
      try {
        // Obtener el código actual para verificación
        const codeToVerify = getLastGeneratedCode();
        
        // Mostrar el código actual para depuración
        addDebugInfo(`CÓDIGO ESPERADO: ${codeToVerify}`);
        
        // Llamada a Google Speech-to-Text
        let recognizedText = await recognizeWithGoogleSpeech(audioUri, codeToVerify);
        
        // Si no se reconoció texto, manejar el error de forma silenciosa
        if (!recognizedText || recognizedText.trim() === '') {
          addDebugInfo('No se reconoció texto en el audio');
          setRecognitionStatus('No se pudo reconocer la voz. Intente ingresar el código manualmente.');
          return;
        }
        
        // Convertir palabras numéricas a dígitos
        recognizedText = convertirPalabrasANumeros(recognizedText);
        addDebugInfo(`Texto después de convertir palabras a números: "${recognizedText}"`);
        
        // Extraer todos los números del texto reconocido
        const numbers = recognizedText.match(/\d+/g);
        
        if (numbers && numbers.length > 0) {
          // 1. Verificar si algún número coincide exactamente con el código esperado
          for (const num of numbers) {
            if (num === codeToVerify) {
              addDebugInfo(`Coincidencia exacta encontrada: ${num} = ${codeToVerify}`);
              setVerificationCode(codeToVerify);
              setCurrentCode(codeToVerify);
              setTimeout(() => verifyCode(codeToVerify), 100);
              return;
            }
          }
          
          // 2. Verificar si el código esperado está contenido en algún número más largo
          for (const num of numbers) {
            if (num.length > codeToVerify.length && num.includes(codeToVerify)) {
              addDebugInfo(`Código encontrado dentro de un número más largo: ${codeToVerify} en ${num}`);
              setVerificationCode(codeToVerify);
              setCurrentCode(codeToVerify);
              setTimeout(() => verifyCode(codeToVerify), 100);
              return;
            }
          }
          
          // 3. Verificar si concatenando números se forma el código esperado
          if (numbers.length > 1) {
            // Unir todos los números en una sola cadena
            const allNumbersJoined = numbers.join('');
            if (allNumbersJoined.includes(codeToVerify)) {
              addDebugInfo(`Código encontrado al unir todos los números: ${codeToVerify} en ${allNumbersJoined}`);
              setVerificationCode(codeToVerify);
              setCurrentCode(codeToVerify);
              setTimeout(() => verifyCode(codeToVerify), 100);
              return;
            }
          }
          
          // 4. Verificar si uniendo los primeros dígitos de cada número se forma el código
          if (numbers.length >= codeToVerify.length) {
            const firstDigits = numbers.map(num => num[0]).join('');
            if (firstDigits.includes(codeToVerify)) {
              addDebugInfo(`Código encontrado usando primer dígito de cada número: ${codeToVerify} en ${firstDigits}`);
              setVerificationCode(codeToVerify);
              setCurrentCode(codeToVerify);
              setTimeout(() => verifyCode(codeToVerify), 100);
              return;
            }
          }
          
          // 5. Extraer todos los dígitos individuales y verificar si la secuencia está presente
          const allDigits = recognizedText.match(/\d/g);
          if (allDigits) {
            const allDigitsJoined = allDigits.join('');
            if (allDigitsJoined.includes(codeToVerify)) {
              addDebugInfo(`Código encontrado en la secuencia de dígitos: ${codeToVerify} en ${allDigitsJoined}`);
              setVerificationCode(codeToVerify);
              setCurrentCode(codeToVerify);
              setTimeout(() => verifyCode(codeToVerify), 100);
              return;
            }
          }
          
          // 6. Si el código tiene 4 dígitos, intentar con combinaciones específicas
          if (codeToVerify.length === 4 && numbers.length >= 4) {
            // Unir los primeros 4 números
            const combinedCode = numbers.slice(0, 4).join('');
            addDebugInfo(`Intentando con combinación de dígitos: ${combinedCode}`);
            
            if (combinedCode === codeToVerify) {
              addDebugInfo(`Coincidencia encontrada con dígitos combinados: ${combinedCode} = ${codeToVerify}`);
              setVerificationCode(codeToVerify);
              setCurrentCode(codeToVerify);
              setTimeout(() => verifyCode(codeToVerify), 100);
              return;
            }
          }
          
          // 7. Verificar si hay una coincidencia parcial significativa (al menos 3 de 4 dígitos)
          if (codeToVerify.length === 4) {
            for (const num of numbers) {
              if (num.length === 4) {
                let matchingDigits = 0;
                for (let i = 0; i < 4; i++) {
                  if (num[i] === codeToVerify[i]) {
                    matchingDigits++;
                  }
                }
                
                if (matchingDigits >= 3) {
                  addDebugInfo(`Coincidencia parcial significativa: ${matchingDigits}/4 dígitos coinciden entre ${num} y ${codeToVerify}`);
                  setVerificationCode(codeToVerify);
                  setCurrentCode(codeToVerify);
                  setTimeout(() => verifyCode(codeToVerify), 100);
                  return;
                }
              }
            }
          }
          
          // Verificar si el código reconocido coincide con el código mostrado en pantalla
          addDebugInfo(`Verificando contra último código generado: ${codeToVerify}`);
          
          // Si llegamos aquí, no se encontró coincidencia
          addDebugInfo(`No se encontró el código en el texto reconocido: "${recognizedText}"`);
          setRecognitionStatus('Código no reconocido. Intente ingresar manualmente.');
        } else {
          addDebugInfo(`No se encontraron números en el texto reconocido: "${recognizedText}"`);
          setRecognitionStatus('No se reconocieron números. Intente ingresar manualmente.');
        }
      } catch (recognitionError) {
        addDebugInfo(`Error al procesar voz: ${recognitionError.message}`);
        setRecognitionStatus('Error al procesar voz. Intente ingresar manualmente.');
      }
    } catch (error) {
      addDebugInfo(`Error general en processVoiceInput: ${error.message}`);
      setRecognitionStatus('Error al procesar entrada de voz');
    }
  };

  // Función para verificar el código
  const verifyCode = (codeToVerify = verificationCode) => {
    // Obtener el código actual para verificación
    const currentVerificationCode = getLastGeneratedCode();
    
    // Mostrar información de depuración
    addDebugInfo(`Verificando código: "${codeToVerify}" contra código actual: "${currentVerificationCode}"`);
    
    if (codeToVerify === currentVerificationCode) {
      // Código correcto
      setModalVisible(false);
      setTimeRemaining(60);
      
      // Detener todos los procesos
      cleanupResources();
      
      // Programar la siguiente verificación
      scheduleNextVerification();
      
      addDebugInfo('Código verificado correctamente');
      
    } else {
      // Código incorrecto
      setVerificationCode('');
      setRecognitionStatus('');
      
      // Vibrar para indicar error
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (hapticError) {
        // Ignorar errores de háptica
      }
      
      addDebugInfo(`Código incorrecto: "${codeToVerify}" != "${currentVerificationCode}"`);
    }
  };

  // Función para leer el código en voz alta
  const speakCode = (code) => {
    try {
      addDebugInfo(`Intentando leer código en voz alta: ${code}`);
      
      // Determinar el idioma y el texto según la configuración del usuario
      const speechLanguage = language === 'es' ? 'es-ES' : 'en-US';
      const speechIntro = language === 'es' ? 'Código de verificación: ' : 'Verification code: ';
      
      addDebugInfo(`Usando idioma para lectura: ${speechLanguage}`);
      
      // Detener cualquier lectura previa
      Speech.stop().then(() => {
        addDebugInfo('Speech.stop() completado');
        
        // Agregar un pequeño retraso antes de hablar
        setTimeout(() => {
          // Leer el código en voz alta
          const codeWithSpaces = code.split('').join(' ');
          addDebugInfo(`Leyendo código en voz alta: ${speechIntro}${codeWithSpaces}`);
          
          Speech.speak(speechIntro + codeWithSpaces, {
            language: speechLanguage,
            pitch: 1.0,
            rate: 0.8,
            onStart: () => {
              addDebugInfo('Lectura del código iniciada');
            },
            onDone: () => {
              addDebugInfo('Lectura del código completada');
              // Iniciar reconocimiento de voz después de leer el código
              if (listeningTimerRef.current) {
                clearTimeout(listeningTimerRef.current);
              }
              
              listeningTimerRef.current = setTimeout(() => {
                startListening();
              }, LISTENING_DELAY);
            },
            onStopped: () => {
              addDebugInfo('Lectura del código detenida');
            },
            onError: (error) => {
              addDebugInfo(`Error al leer código: ${error}`);
              // Iniciar reconocimiento de voz incluso si hay un error en la lectura
              if (listeningTimerRef.current) {
                clearTimeout(listeningTimerRef.current);
              }
              
              listeningTimerRef.current = setTimeout(() => {
                startListening();
              }, LISTENING_DELAY);
            }
          });
        }, SPEECH_DELAY);
      }).catch(error => {
        addDebugInfo(`Error en Speech.stop(): ${error}`);
        // Continuar con la lectura incluso si hay un error al detener
        setTimeout(() => {
          const codeWithSpaces = code.split('').join(' ');
          addDebugInfo(`Leyendo código en voz alta (después de error en stop): ${speechIntro}${codeWithSpaces}`);
          
          Speech.speak(speechIntro + codeWithSpaces, {
            language: speechLanguage,
            pitch: 1.0,
            rate: 0.8,
            onDone: () => {
              addDebugInfo('Lectura del código completada (después de error)');
              if (listeningTimerRef.current) {
                clearTimeout(listeningTimerRef.current);
              }
              
              listeningTimerRef.current = setTimeout(() => {
                startListening();
              }, LISTENING_DELAY);
            }
          });
        }, SPEECH_DELAY);
      });
    } catch (speechError) {
      addDebugInfo(`Error general al leer código en voz alta: ${speechError.message}`);
      // Iniciar reconocimiento de voz incluso si hay un error en la lectura
      if (listeningTimerRef.current) {
        clearTimeout(listeningTimerRef.current);
      }
      
      listeningTimerRef.current = setTimeout(() => {
        startListening();
      }, LISTENING_DELAY);
    }
  };

  // Función para reconocer la entrada de voz con Google Speech-to-Text
  const recognizeWithGoogleSpeech = async (audioUri, expectedCode) => {
    addDebugInfo('Llamando a Google Speech-to-Text API');
    
    try {
      // Verificar que el URI sea válido
      if (!audioUri || typeof audioUri !== 'string') {
        throw new Error('URI de audio inválido');
      }
      
      // Verificar que el archivo exista
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists || fileInfo.size < 1000) {
        throw new Error('Archivo de audio no válido');
      }
      
      addDebugInfo(`Procesando archivo de audio: ${audioUri} (tamaño: ${fileInfo.size} bytes)`);
      
      // 1. Obtener el archivo de audio
      const audioFile = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 });
      
      addDebugInfo(`Archivo codificado en Base64 (longitud: ${audioFile.length})`);
      
      // 2. Preparar la petición a Google Speech-to-Text
      const apiKey = 'AIzaSyDGqyJR4KZRJt9qRLmeGjdlgIBt_nb7Kqw';
      addDebugInfo(`Enviando solicitud a Google Speech API con clave: ${apiKey.substring(0, 5)}...`);
      
      // Crear un contexto de reconocimiento específico para números en ambos idiomas
      const speechContext = {
        phrases: [
          expectedCode,
          ...expectedCode.split(''),
          '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
          // Palabras en español
          'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
          // Palabras en inglés
          'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'
        ],
        boost: 20
      };
      
      // Determinar el idioma principal según la configuración del usuario
      const primaryLanguage = language === 'es' ? 'es-ES' : 'en-US';
      const secondaryLanguage = language === 'es' ? 'en-US' : 'es-ES';
      
      addDebugInfo(`Usando idioma primario para reconocimiento: ${primaryLanguage}, secundario: ${secondaryLanguage}`);
      
      // Configuración para reconocimiento multilingüe
      const requestBody = {
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: primaryLanguage,
          alternativeLanguageCodes: [secondaryLanguage],
          model: 'command_and_search',
          speechContexts: [speechContext],
          useEnhanced: true,
          profanityFilter: false,
          enableAutomaticPunctuation: false,
          enableWordTimeOffsets: false
        },
        audio: {
          content: audioFile
        }
      };
      
      addDebugInfo('Enviando solicitud a Google Speech API...');
      
      const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      // 3. Procesar la respuesta
      if (!response.ok) {
        const errorText = await response.text();
        addDebugInfo(`Error en respuesta de API: ${response.status} - ${errorText}`);
        throw new Error(`Error en respuesta de API: ${response.status}`);
      }
      
      const data = await response.json();
      addDebugInfo(`Respuesta recibida: ${JSON.stringify(data)}`);
      
      // 4. Extraer el texto reconocido
      if (data.results && data.results.length > 0) {
        const recognizedText = data.results[0].alternatives[0].transcript;
        addDebugInfo(`Google Speech-to-Text reconoció: "${recognizedText}"`);
        return recognizedText;
      } else {
        addDebugInfo('No se encontraron resultados en la respuesta de la API');
        throw new Error('No se pudo reconocer ningún texto en el audio');
      }
    } catch (error) {
      addDebugInfo(`Error al llamar a Google Speech-to-Text: ${error.message}`);
      throw error;
    }
  };

  // Función para convertir palabras numéricas a dígitos
  const convertirPalabrasANumeros = (texto) => {
    const mapaPalabras = {
      // Español
      'cero': '0', 
      'uno': '1', 'un': '1', 'una': '1', 
      'dos': '2', 
      'tres': '3', 
      'cuatro': '4', 
      'cinco': '5', 
      'seis': '6', 
      'siete': '7', 
      'ocho': '8', 
      'nueve': '9',
      // Inglés
      'zero': '0',
      'one': '1',
      'two': '2',
      'three': '3',
      'four': '4',
      'five': '5',
      'six': '6',
      'seven': '7',
      'eight': '8',
      'nine': '9'
    };
    
    // Convertir a minúsculas para mejor coincidencia
    let textoLower = texto.toLowerCase();
    
    // Reemplazar cada palabra numérica con su dígito
    Object.keys(mapaPalabras).forEach(palabra => {
      const regex = new RegExp('\\b' + palabra + '\\b', 'g');
      textoLower = textoLower.replace(regex, mapaPalabras[palabra]);
    });
    
    // Registrar la conversión para depuración
    if (textoLower !== texto.toLowerCase()) {
      addDebugInfo(`Texto convertido: "${texto}" -> "${textoLower}"`);
    }
    
    return textoLower;
  };

  // Activar la verificación
  const triggerVerification = () => {
    try {
      // Generar un nuevo código aleatorio
      const newCode = generateRandomCode();
      
      // Asegurarse de que el currentCode se actualice inmediatamente
      setCurrentCode(newCode);
      
      // Registrar el nuevo código para depuración
      addDebugInfo(`CÓDIGO GENERADO: ${newCode}`);
      
      setVerificationCode('');
      setTimeRemaining(30);
      setModalVisible(true);
      
      // Mostrar el código en los logs para depuración
      addDebugInfo(`CÓDIGO ACTUAL: ${newCode}`);
      
      // Iniciar vibración para alertar al usuario
      startConstantVibration();
      
      // Iniciar temporizador de cuenta regresiva
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      
      countdownTimerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Tiempo agotado
            handleVerificationTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Leer el código en voz alta inmediatamente
      addDebugInfo(`Llamando a speakCode con código: ${newCode}`);
      speakCode(newCode);
      
    } catch (error) {
      addDebugInfo(`Error al iniciar verificación: ${error.message}`);
      cleanupResources();
    }
  };

  // Manejar tiempo de espera agotado
  const handleVerificationTimeout = () => {
    // Limpiar temporizadores
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    
    // Detener vibración
    stopVibration();
    
    // Detener grabación si está activa
    stopListening();
    
    // Ocultar el modal
    setModalVisible(false);
    
    // Notificar fallo de verificación
    if (onVerificationFailed) {
      onVerificationFailed('Tiempo de espera agotado para la verificación de autenticación');
    }
    
    // Programar la siguiente verificación
    scheduleNextVerification();
  };

  // Renderizar el componente
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {
        setModalVisible(false);
        cleanupResources();
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('verificationRequired')}</Text>
          <Text style={styles.modalSubtitle}>{t('enterVerificationCode')}</Text>
          
          <Text style={styles.codeDisplay}>{currentCode}</Text>
          
          <Text style={styles.timeRemaining}>
            {t('timeRemaining', { time: timeRemaining })}
          </Text>
          
          {isListening ? (
            <View style={styles.listeningContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.listeningText}>{t('listening')}</Text>
              <Text style={styles.speakCodeText}>{t('speakCode')}</Text>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.codeInput}
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder={t('enterCode')}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.verifyButton]}
              onPress={() => verifyCode(verificationCode)}
            >
              <Text style={styles.buttonText}>{t('verify')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setModalVisible(false);
                cleanupResources();
              }}
            >
              <Text style={styles.buttonText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
          
          {recognitionStatus && (
            <Text style={styles.recognitionStatus}>{recognitionStatus}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: Dimensions.get('window').width * 0.9,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#4A90E2',
  },
  modalSubtitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
  },
  codeDisplay: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#4A90E2',
    marginBottom: 20,
  },
  timeRemaining: {
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    height: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  codeInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 24,
    padding: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    width: '45%',
    alignItems: 'center',
  },
  verifyButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listeningContainer: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  listeningText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  speakCodeText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  recognitionStatus: {
    marginTop: 10,
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
});

export default VerificationPrompt;