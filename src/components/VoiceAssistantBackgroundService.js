import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import voiceAssistantInstance, { VoiceAssistantService } from '../services/VoiceAssistantService';
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
        // Usar la instancia por defecto en lugar de crear una nueva
        // Esto evita el error "constructor is not callable"
        const voiceService = voiceAssistantInstance;
        
        // Desactivar las alertas automáticas para evitar duplicados
        voiceService.showInitAlerts = false;
        
        // Inicializar el servicio
        const success = await voiceService.initialize();
        
        if (success) {
          setInitialized(true);
          setStatusMessage(`Asistente de voz ${voiceService.usingRealRecognition ? 'con reconocimiento real' : 'en modo simulación'}`);
          setShowMessage(true);
          setTimeout(() => setShowMessage(false), 3000);
        } else {
          setStatusMessage('Error al inicializar el asistente de voz');
          setShowMessage(true);
          setTimeout(() => setShowMessage(false), 3000);
        }
        
        // Restaurar console.log original al desmontar
        return () => {
          voiceService.stop();
        };
      } catch (error) {
        console.error('Error en VoiceAssistantBackgroundService:', error);
        setStatusMessage('Error en el servicio de asistente de voz');
        setShowMessage(true);
        setTimeout(() => setShowMessage(false), 3000);
      }
    };
    
    initService();
  }, []);

  // No renderizar nada si no hay mensajes para mostrar
  if (!showMessage) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>{statusMessage}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 4,
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  }
});

export default VoiceAssistantBackgroundService;
