import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  Vibration,
  Dimensions,
  Platform
} from 'react-native';
import * as Haptics from 'expo-haptics';

const VERIFICATION_INTERVAL = 60000; // 1 minuto en milisegundos
const VIBRATION_PATTERN = Platform.OS === 'android' ? [1000, 1000] : [1000, 2000, 1000, 2000]; // Patrón de vibración (vibrar, pausa)

const VerificationPrompt = ({ isWorking, onVerificationFailed }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [currentCode, setCurrentCode] = useState('');
  
  // Usar useRef en lugar de useState para los timers para evitar re-renderizaciones
  const verificationTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const vibrationIntervalRef = useRef(null);
  const hapticIntervalRef = useRef(null);

  // Función para generar un código aleatorio de 4 dígitos
  const generateRandomCode = () => {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  };

  // Limpiar timers cuando el componente se desmonta
  useEffect(() => {
    return () => {
      stopVibration();
      if (verificationTimerRef.current) {
        clearTimeout(verificationTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

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
      
      console.log('Timer de verificación iniciado, se activará en', VERIFICATION_INTERVAL / 1000, 'segundos');
    } else if (!isWorking) {
      // Cerrar el modal si está abierto y el usuario deja de trabajar
      if (modalVisible) {
        setModalVisible(false);
        stopVibration();
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
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
          console.log('Error en haptics interval:', error);
        }
      }, 2000);
      
      console.log('Vibración constante iniciada');
    } catch (error) {
      console.error('Error al iniciar vibración constante:', error);
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
      
      console.log('Vibración detenida');
    } catch (error) {
      console.error('Error al detener vibración:', error);
    }
  };

  // Programar la siguiente verificación
  const scheduleNextVerification = () => {
    if (verificationTimerRef.current) {
      clearTimeout(verificationTimerRef.current);
    }
    
    verificationTimerRef.current = setTimeout(() => {
      console.log('Ejecutando verificación programada');
      triggerVerification();
    }, VERIFICATION_INTERVAL);
    
    console.log('Próxima verificación programada para dentro de', VERIFICATION_INTERVAL / 1000, 'segundos');
  };

  // Función para activar la verificación
  const triggerVerification = () => {
    // Generar un nuevo código aleatorio
    const newCode = generateRandomCode();
    
    // Actualizar el estado con el nuevo código
    setCurrentCode(newCode);
    
    // Iniciar vibración constante
    startConstantVibration();
    
    // Mostrar el modal
    setModalVisible(true);
    setVerificationCode('');
    setTimeRemaining(30);
    
    // Iniciar cuenta regresiva
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    
    countdownTimerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          setModalVisible(false);
          stopVibration();
          
          // Notificar que la verificación falló
          if (onVerificationFailed) {
            onVerificationFailed();
          }
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Función para verificar el código
  const verifyCode = () => {
    if (verificationCode === currentCode) {
      // Código correcto
      setModalVisible(false);
      setTimeRemaining(30);
      
      // Detener vibración
      stopVibration();
      
      // Limpiar el contador
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      
      // Programar la siguiente verificación
      scheduleNextVerification();
      
    } else {
      // Código incorrecto
      Alert.alert('Código incorrecto', 'Por favor, intenta nuevamente.');
      setVerificationCode('');
      
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
      } catch (error) {
        console.error('Error al vibrar para error:', error);
        // Asegurar que la vibración constante continúe incluso si hay un error
        startConstantVibration();
      }
    }
  };

  // Renderizar el componente
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {
        // No permitir cerrar con el botón de atrás
      }}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Verificación de Presencia</Text>
          <Text style={styles.modalText}>
            Por favor, ingresa el código de verificación para confirmar que sigues trabajando.
          </Text>
          
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>Código:</Text>
            <Text style={styles.codeValue}>{currentCode}</Text>
          </View>
          
          <TextInput
            style={styles.input}
            onChangeText={setVerificationCode}
            value={verificationCode}
            placeholder="Ingresa el código mostrado"
            keyboardType="numeric"
            maxLength={4}
            autoFocus={true}
          />
          
          <Text style={styles.timerText}>
            Tiempo restante: {timeRemaining} segundos
          </Text>
          
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={verifyCode}
          >
            <Text style={styles.verifyButtonText}>Verificar</Text>
          </TouchableOpacity>
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
  },
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
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
});

export default VerificationPrompt;
