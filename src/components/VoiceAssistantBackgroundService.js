import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import voiceAssistant from '../services/VoiceAssistantService';
import { useLanguage } from '../context/LanguageContext';

/**
 * Componente que inicializa y mantiene el servicio de asistente de voz en segundo plano
 * Este componente debe incluirse en un nivel alto de la aplicación para que esté siempre disponible
 */
const VoiceAssistantBackgroundService = () => {
  const { t } = useLanguage();
  const [initialized, setInitialized] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const initService = async () => {
      try {
        // Crear una nueva instancia del servicio de voz
        const voiceService = new voiceAssistant();
        
        // Desactivar las alertas automáticas para evitar duplicados
        voiceService.showInitAlerts = false;
        
        // Inicializar el servicio
        const success = await voiceService.initialize();
        
        if (success) {
          setInitialized(true);
          setStatusMessage(`Asistente de voz ${voiceService.usingRealRecognition ? 'con reconocimiento real' : 'en modo simulación'}`);
        } else {
          setStatusMessage('Error al inicializar el asistente de voz');
        }
        
        // Restaurar console.log original al desmontar
        return () => {
          voiceService.stop();
        };
      } catch (error) {
        console.error('Error en VoiceAssistantBackgroundService:', error);
        setStatusMessage('Error en el servicio de asistente de voz');
      }
    };
    
    initService();
  }, []);

  // No renderizar nada si no hay mensajes para mostrar
  if (!showMessage) return null;

  return (
    <View style={styles.container}>
      <View style={styles.messageContainer}>
        <Text style={styles.message}>{statusMessage}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000
  },
  messageContainer: {
    backgroundColor: 'rgba(46, 46, 46, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    maxWidth: '80%'
  },
  message: {
    color: '#fff3e5',
    fontSize: 14,
    textAlign: 'center'
  }
});

export default VoiceAssistantBackgroundService;
