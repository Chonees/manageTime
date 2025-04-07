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

const VERIFICATION_INTERVAL = 600000; // 10 minutos en milisegundos (antes era 10000 - 10 segundos)
const VIBRATION_PATTERN = Platform.OS === 'android' ? [1000, 1000] : [1000, 2000, 1000, 2000]; // Patrón de vibración (vibrar, pausa)
const SPEECH_DELAY = 1000; // Retraso antes de leer el código en voz alta (ms)
const LISTENING_DELAY = 0; // Retraso antes de activar el micrófono (ms)
const LISTENING_TIMEOUT = 10000; // Tiempo máximo de escucha (ms)

const VerificationPrompt = ({ isWorking, onVerificationFailed }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [currentCode, setCurrentCode] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognitionStatus, setRecognitionStatus] = useState('');
  const [recordingAttempts, setRecordingAttempts] = useState(0);
  const MAX_RECORDING_ATTEMPTS = 3;
  
  // Usar useRef en lugar de useState para los timers para evitar re-renderizaciones
  const verificationTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const vibrationIntervalRef = useRef(null);
  const hapticIntervalRef = useRef(null);
  const recordingRef = useRef(null);
  const speechTimerRef = useRef(null);
  const listeningTimerRef = useRef(null);
  const listeningTimeoutRef = useRef(null);

  // Función para generar un código aleatorio de 4 dígitos
  const generateRandomCode = () => {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
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
    
    if (isWorking && !modalVisible) {
      // Iniciar el timer de verificación cuando el usuario comienza a trabajar
      verificationTimerRef.current = setTimeout(() => {
        triggerVerification();
      }, VERIFICATION_INTERVAL);
      
      addDebugInfo(`Timer de verificación iniciado, se activará en ${VERIFICATION_INTERVAL / 1000} segundos`);
    } else if (!isWorking) {
      // Cerrar el modal si está abierto y el usuario deja de trabajar
      if (modalVisible) {
        setModalVisible(false);
        cleanupResources();
        setTimeRemaining(30);
      }
    }
  }, [isWorking, modalVisible]);

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
    // Limpiar el timer anterior si existe
    if (verificationTimerRef.current) {
      clearTimeout(verificationTimerRef.current);
      verificationTimerRef.current = null;
    }
    
    // Solo programar si el usuario está trabajando
    if (isWorking) {
      addDebugInfo(`Próxima verificación programada para dentro de 10 segundos`);
      verificationTimerRef.current = setTimeout(() => {
        triggerVerification();
      }, VERIFICATION_INTERVAL);
    }
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
            interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS,
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
      
      // Limpiar grabaciones anteriores
      await ensureNoActiveRecordings();
      
      try {
        // Crear una nueva instancia de grabación
        addDebugInfo('Creando nueva instancia de grabación...');
        const recording = new Audio.Recording();
        
        // Configuración simplificada para mayor compatibilidad
        addDebugInfo('Preparando grabación con configuración simplificada...');
        await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
        
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
      
      // Si no hay URI, continuar sin mostrar alerta
      if (!audioUri) {
        return;
      }
      
      setRecognitionStatus('Procesando...');
      
      try {
        // Llamada a Google Speech-to-Text - Procesamiento más rápido
        let recognizedText = await recognizeWithGoogleSpeech(audioUri, currentCode);
        
        // Convertir palabras numéricas a dígitos
        recognizedText = convertirPalabrasANumeros(recognizedText);
        
        // Verificación rápida: si el texto contiene el código actual
        if (recognizedText.includes(currentCode)) {
          verifyCode(currentCode);
          return;
        }
        
        // Extraer números del texto reconocido - Algoritmo optimizado
        const numbers = recognizedText.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          // Verificar si alguno de los números coincide con el código
          for (const num of numbers) {
            if (num === currentCode) {
              verifyCode(currentCode);
              return;
            }
          }
          
          // Intentar con el primer número encontrado
          const potentialCode = numbers[0].substring(0, 4);
          if (potentialCode.length === 4) {
            verifyCode(potentialCode);
          } else {
            // Intentar unir dígitos individuales si hay al menos 4
            const digitosIndividuales = recognizedText.match(/\d/g);
            if (digitosIndividuales && digitosIndividuales.length >= 4) {
              const codigoUnido = digitosIndividuales.slice(0, 4).join('');
              verifyCode(codigoUnido);
              return;
            }
          }
        }
      } catch (error) {
        // Simplemente continuar sin mostrar error
      } finally {
        setRecognitionStatus('');
      }
      
    } catch (error) {
      setRecognitionStatus('');
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
      
      // Verificar que el archivo exista - Verificación rápida
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists || fileInfo.size < 1000) {
        throw new Error('Archivo de audio no válido');
      }
      
      // 1. Obtener el archivo de audio
      const audioFile = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 });
      
      // 2. Preparar la petición a Google Speech-to-Text con configuración optimizada
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
            model: 'command_and_search', // Modelo optimizado para comandos cortos
            speechContexts: [{
              phrases: [expectedCode, ...expectedCode.split('')], // Ayuda al reconocimiento con el código esperado
              boost: 10 // Aumenta la probabilidad de reconocer estos términos
            }]
          },
          audio: {
            content: audioFile,
          },
        }),
      });
      
      // 3. Procesar la respuesta
      const data = JSON.parse(await response.text());
      
      // 4. Extraer el texto reconocido
      if (data.results && data.results.length > 0) {
        const recognizedText = data.results[0].alternatives[0].transcript;
        addDebugInfo(`Google Speech-to-Text reconoció: "${recognizedText}"`);
        return recognizedText;
      } else {
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
      'cero': '0', 'zero': '0',
      'uno': '1', 'un': '1', 'una': '1', 'one': '1',
      'dos': '2', 'two': '2',
      'tres': '3', 'three': '3',
      'cuatro': '4', 'four': '4',
      'cinco': '5', 'five': '5',
      'seis': '6', 'six': '6',
      'siete': '7', 'seven': '7',
      'ocho': '8', 'eight': '8',
      'nueve': '9', 'nine': '9'
    };
    
    // Convertir a minúsculas para mejor coincidencia
    let textoLower = texto.toLowerCase();
    
    // Reemplazar cada palabra numérica con su dígito
    Object.keys(mapaPalabras).forEach(palabra => {
      const regex = new RegExp('\\b' + palabra + '\\b', 'g');
      textoLower = textoLower.replace(regex, mapaPalabras[palabra]);
    });
    
    return textoLower;
  };

  // Función para verificar el código
  const verifyCode = (codeToVerify = verificationCode) => {
    if (codeToVerify === currentCode) {
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
        // Pausa breve en la vibración constante
        stopVibration();
        
        // Vibración corta de error
        Vibration.vibrate(300);
        
        // Reanudar vibración constante después de un breve retraso
        setTimeout(() => {
          startConstantVibration();
        }, 500);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        // Volver a leer el código y reintentar
        setTimeout(() => {
          speakCode(currentCode);
          
          // Reintentar escucha después de leer el código
          setTimeout(() => {
            startListening();
          }, LISTENING_DELAY);
        }, 1500);
        
      } catch (error) {
        addDebugInfo(`Error al vibrar para error: ${error.message}`);
        // Asegurar que la vibración constante continúe incluso si hay un error
        startConstantVibration();
      }
    }
  };

  // Función para leer el código en voz alta usando Google Cloud Text-to-Speech
  const speakCode = async (code) => {
    try {
      // Formatear el código para que se lea dígito por dígito con pausas
      const formattedCode = code.split('').join(', ');
      const textToSpeak = `Código de verificación: ${formattedCode}`;
      
      console.log('Llamando a Google Cloud Text-to-Speech API');
      
      // Llamar a la API de Google Cloud Text-to-Speech
      const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=AIzaSyDGqyJR4KZRJt9qRLmeGjdlgIBt_nb7Kqw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            text: textToSpeak,
          },
          voice: {
            languageCode: 'es-ES',
            name: 'es-ES-Standard-A',
            ssmlGender: 'FEMALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.85,
            pitch: 0,
            volumeGainDb: 3.0
          }
        }),
      });
      
      // Procesar la respuesta
      const data = await response.json();
      
      if (!data.audioContent) {
        throw new Error('No se recibió contenido de audio de la API');
      }
      
      // Guardar el audio en un archivo temporal
      const audioPath = `${FileSystem.cacheDirectory}speech_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(audioPath, data.audioContent, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Reproducir el audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioPath },
        { shouldPlay: true, volume: 1.0 }
      );
      
      // Esperar a que termine la reproducción
      await new Promise((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            resolve();
          }
        });
      });
      
      // Liberar recursos
      await sound.unloadAsync();
      
      // Iniciar reconocimiento de voz inmediatamente después de reproducir el audio
      startListening();
      
      return true;
    } catch (error) {
      console.log(`Error al usar Text-to-Speech: ${error.message}`);
      return false;
    }
  };

  // Activar la verificación
  const triggerVerification = () => {
    // Detener cualquier verificación en curso
    if (verificationTimerRef.current) {
      clearTimeout(verificationTimerRef.current);
      verificationTimerRef.current = null;
    }
    
    // Detener cualquier vibración en curso
    stopVibration();
    
    // Limpiar estados anteriores
    setRecognitionStatus('');
    
    // Generar un nuevo código aleatorio
    const newCode = generateRandomCode();
    setCurrentCode(newCode);
    
    // Limpiar el código ingresado por el usuario
    setVerificationCode('');
    
    // Mostrar el modal
    setModalVisible(true);
    
    // Iniciar vibración constante
    startConstantVibration();
    
    // Reiniciar el sistema de audio completamente antes de iniciar
    ensureNoActiveRecordings();
    
    // Iniciar el temporizador de cuenta regresiva
    setTimeRemaining(60);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    
    countdownTimerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Tiempo agotado
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          
          // Ocultar el modal
          setModalVisible(false);
          
          // Detener vibración
          stopVibration();
          
          // Notificar fallo de verificación
          if (onVerificationFailed) {
            onVerificationFailed('Tiempo de espera agotado para la verificación de autenticación');
          }
          
          // Programar la siguiente verificación
          scheduleNextVerification();
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Efecto para leer el código en voz alta cuando se muestra el modal
  useEffect(() => {
    if (modalVisible && currentCode) {
      // Pequeño retraso para asegurar que el modal esté completamente visible
      setTimeout(() => {
        speakCode(currentCode);
      }, 500);
    }
  }, [modalVisible, currentCode]);

  // Renderizar el componente
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {
        // No permitir cerrar el modal con el botón de atrás
      }}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Verificación de Presencia</Text>
          
          <Text style={styles.modalText}>
            Por favor, verifique su presencia ingresando el siguiente código:
          </Text>
          
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>Código:</Text>
            <Text style={styles.codeValue}>{currentCode}</Text>
            <TouchableOpacity 
              style={styles.speakButton}
              onPress={() => speakCode(currentCode)}
            >
              <Ionicons name="volume-high" size={24} color="#4A90E2" />
            </TouchableOpacity>
          </View>
          
          {isListening ? (
            <View style={styles.listeningContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.listeningText}>
                {recognitionStatus || "Escuchando..."}
              </Text>
            </View>
          ) : (
            <TextInput
              style={styles.input}
              onChangeText={setVerificationCode}
              value={verificationCode}
              placeholder="O ingrese el código manualmente"
              keyboardType="numeric"
              maxLength={4}
            />
          )}
          
          <Text style={styles.timerText}>
            Tiempo restante: {timeRemaining} segundos
          </Text>
          
          {!isListening && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={() => verifyCode()}
                disabled={verificationCode.length !== 4}
              >
                <Text style={styles.verifyButtonText}>Verificar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
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
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
  },
  codeContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  codeValue: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#4A90E2',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  timerText: {
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    alignItems: 'center',
  },
  verifyButtonText: {
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
  speakButton: {
    marginLeft: 10,
    padding: 5,
  },
});

export default VerificationPrompt;
