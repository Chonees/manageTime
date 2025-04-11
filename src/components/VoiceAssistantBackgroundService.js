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
        // Interceptar los logs de la función de voz para mostrar estados importantes
        const originalConsoleLog = console.log;
        console.log = function(...args) {
          originalConsoleLog.apply(console, args);
          
          // Si es un mensaje del sistema de voz, actualizar estado
          if (typeof args[0] === 'string' && args[0].includes('[Voz]')) {
            const message = args.join(' ').replace('[Voz]', '').trim();
            setStatusMessage(message);
            
            // Mostrar brevemente el mensaje de estado
            setShowMessage(true);
            setTimeout(() => setShowMessage(false), 3000);
          }
        };
        
        // Inicializar el servicio
        const success = await voiceAssistant.initialize();
        setInitialized(success);
        
        if (success) {
          setStatusMessage(t('voiceAssistantActive'));
          setShowMessage(true);
          setTimeout(() => setShowMessage(false), 3000);
        } else {
          setStatusMessage(t('voiceAssistantError'));
          setShowMessage(true);
          setTimeout(() => setShowMessage(false), 5000);
        }
        
        // Restaurar el console.log original cuando se desmonte
        return () => {
          console.log = originalConsoleLog;
          voiceAssistant.stop();
        };
      } catch (error) {
        console.error('Error inicializando asistente de voz en segundo plano:', error);
        setStatusMessage(t('voiceAssistantError'));
        setShowMessage(true);
        setTimeout(() => setShowMessage(false), 5000);
      }
    };
    
    initService();
  }, [t]);

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
