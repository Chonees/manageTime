import * as Speech from 'expo-speech';
import * as SpeechRecognition from 'expo-speech-recognition';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from './api';
import { Platform, Alert } from 'react-native';

class VoiceAssistantService {
  constructor() {
    this.isListening = false;
    this.activationKeyword = "bitacora";
    this.recordingState = "idle"; // idle, listening_for_note, confirming
    this.currentNote = "";
    this.activeTask = null;
    this.recognitionSubscription = null;
    
    // Indicador de reconocimiento activo
    this.usingRealRecognition = false;
    
    // Control para mostrar o no alertas
    this.showInitAlerts = true;
    
    // Temporizador para reintentar escucha
    this.restartTimer = null;
  }

  async initialize() {
    console.log("Inicializando servicio de asistente de voz...");
    
    try {
      // Verificar si el reconocimiento de voz está disponible
      const available = await this.checkVoiceAvailability();
      
      if (available) {
        this.usingRealRecognition = true;
        console.log("Reconocimiento de voz disponible, iniciando escucha continua");
        
        // Iniciar escucha en segundo plano para detectar palabra clave
        this.startBackgroundListening();
        
        // Informar al usuario que el asistente está activo
        await Speech.speak("Asistente de voz activado. Diga bitácora para activar la grabación de notas.", {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9
        });
      } else {
        this.usingRealRecognition = false;
        console.log("Reconocimiento de voz no disponible, usando simulación");
        
        // Informar al usuario que el asistente está en modo simulación
        await Speech.speak("Reconocimiento de voz no disponible. Por favor, use la pantalla de Asistente de Voz para probar la funcionalidad.", {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9
        });
        
        if (this.showInitAlerts) {
          Alert.alert(
            "Asistente de Voz - Modo Simulación",
            "El reconocimiento de voz no está disponible en este dispositivo. Use la pantalla de Asistente de Voz para probar la funcionalidad.",
            [{ text: "Entendido" }]
          );
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error al inicializar asistente de voz:", error);
      this.usingRealRecognition = false;
      return false;
    }
  }
  
  async checkVoiceAvailability() {
    try {
      if (Platform.OS === 'web') {
        console.log("Reconocimiento de voz no soportado en web");
        return false;
      }
      
      // Verificar si el reconocimiento de voz está disponible en el dispositivo
      try {
        // Intentamos acceder a SpeechRecognition de expo
        if (!SpeechRecognition || typeof SpeechRecognition.requestPermissionsAsync !== 'function') {
          console.log("SpeechRecognition no está disponible como módulo");
          return false;
        }
        
        // Solicitar permisos antes de verificar disponibilidad
        const { granted } = await SpeechRecognition.requestPermissionsAsync();
        if (!granted) {
          console.log("Permisos para reconocimiento de voz denegados");
          return false;
        }
        
        // Verificar disponibilidad
        const isAvailable = await SpeechRecognition.isAvailableAsync();
        console.log("SpeechRecognition disponible:", isAvailable);
        return isAvailable;
      } catch (error) {
        console.error("Error verificando disponibilidad:", error);
        return false;
      }
    } catch (error) {
      console.error("Error en checkVoiceAvailability:", error);
      return false;
    }
  }
  
  async startBackgroundListening() {
    if (!this.usingRealRecognition) {
      console.log("No se puede iniciar escucha: reconocimiento no disponible");
      return;
    }
    
    try {
      if (this.isListening) {
        console.log("Ya estamos escuchando, no es necesario reiniciar");
        return;
      }
      
      console.log("Iniciando escucha en segundo plano...");
      this.isListening = true;
      
      // Iniciar reconocimiento
      this.recognitionSubscription = SpeechRecognition.startListeningAsync({
        locale: 'es-ES',
        continuous: true
      }, this.handleSpeechResults.bind(this));
      
      console.log("Escucha iniciada correctamente");
    } catch (error) {
      console.error("Error al iniciar reconocimiento:", error);
      this.isListening = false;
      this.usingRealRecognition = false;
      
      // Reintentar después de un tiempo
      this.scheduleRecognitionRestart();
    }
  }
  
  scheduleRecognitionRestart() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
    }
    
    this.restartTimer = setTimeout(() => {
      console.log("Reintentando iniciar reconocimiento...");
      this.startBackgroundListening();
    }, 10000); // Reintentar cada 10 segundos
  }
  
  async stopListening() {
    if (!this.isListening || !this.usingRealRecognition) return;
    
    try {
      await SpeechRecognition.stopListeningAsync();
      this.isListening = false;
      
      if (this.recognitionSubscription) {
        this.recognitionSubscription.remove();
        this.recognitionSubscription = null;
      }
      
      console.log("Escucha detenida");
    } catch (error) {
      console.error("Error al detener escucha:", error);
    }
  }
  
  async handleSpeechResults(results) {
    try {
      if (!results || !results.value || results.value.length === 0) return;
      
      // Tomar la transcripción más probable
      const transcript = results.value[0].toLowerCase();
      console.log("Transcripción reconocida:", transcript);
      
      // Procesar según el estado
      await this.processVoiceInput(transcript);
    } catch (error) {
      console.error("Error procesando resultados de voz:", error);
    }
  }
  
  async processVoiceInput(text) {
    console.log(`Procesando entrada de voz: "${text}" (Estado: ${this.recordingState})`);
    
    // Convertir a minúsculas para comparaciones
    const lowerText = text.toLowerCase().trim();
    
    // Estado: esperando palabra de activación
    if (this.recordingState === "idle") {
      // Detección de palabra clave
      if (lowerText.includes(this.activationKeyword)) {
        console.log("Palabra clave detectada: bitacora");
        
        // Pausar brevemente la escucha para hablar
        await this.stopListening();
        
        // Buscar tarea activa y continuar flujo
        await this.findActiveTask();
        
        // Reiniciar escucha si hemos vuelto a idle
        if (this.recordingState === "idle") {
          this.startBackgroundListening();
        }
      }
    }
    // Estado: grabando nota
    else if (this.recordingState === "listening_for_note") {
      // Guardar la nota
      this.currentNote = text;
      console.log("Nota grabada:", this.currentNote);
      
      // Pausar brevemente la escucha
      await this.stopListening();
      
      // Solicitar confirmación
      await this.askForConfirmation();
    }
    // Estado: esperando confirmación
    else if (this.recordingState === "confirming") {
      // Buscar confirmación en la respuesta
      if (lowerText.includes("sí") || lowerText.includes("si") || lowerText === "sí" || lowerText === "si") {
        console.log("Confirmación recibida: SÍ");
        
        // Pausar la escucha
        await this.stopListening();
        
        // Guardar la nota
        await this.saveNote();
        
        // Reiniciar escucha después de guardar
        if (this.recordingState === "idle") {
          this.startBackgroundListening();
        }
      }
      else if (lowerText.includes("no") || lowerText === "no") {
        console.log("Confirmación recibida: NO");
        
        // Pausar la escucha
        await this.stopListening();
        
        // Cancelar la grabación
        await this.cancelNote();
        
        // Reiniciar escucha
        if (this.recordingState === "idle") {
          this.startBackgroundListening();
        }
      }
      else {
        console.log("Respuesta no reconocida como confirmación:", lowerText);
        
        // Pausar brevemente la escucha
        await this.stopListening();
        
        // Repetir la solicitud
        await this.askForConfirmation();
      }
    }
  }
  
  // Esta función es para la compatibilidad con el simulador
  async simulateVoiceRecognition(simulatedText) {
    console.log("Simulando reconocimiento de voz:", simulatedText);
    await this.processVoiceInput(simulatedText);
  }

  async findActiveTask() {
    try {
      await Speech.speak("Verificando tarea activa...", {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9
      });
      
      const token = await AsyncStorage.getItem('token');
      
      // Buscar la tarea activa que tenga modo manos libres
      const activeTaskResponse = await api.getActiveTask(token);
      
      if (activeTaskResponse && activeTaskResponse.id) {
        this.activeTask = activeTaskResponse;
        
        // Cambiar estado y solicitar la nota
        this.recordingState = "listening_for_note";
        
        await Speech.speak(`Tarea activa encontrada: ${this.activeTask.title}. Por favor, dicte su mensaje después del tono.`, {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9
        });
        
        // Reproducir un tono
        setTimeout(async () => {
          await Speech.speak("beep", { pitch: 1.5, rate: 1.2 });
          
          // Reiniciar escucha para captar la nota
          if (this.usingRealRecognition) {
            this.startBackgroundListening();
          }
        }, 1000);
      } else {
        await Speech.speak("No se encontró ninguna tarea activa con modo manos libres. Por favor, active una tarea primero.", {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9
        });
        
        this.recordingState = "idle";
      }
    } catch (error) {
      console.error("Error al buscar tarea activa:", error);
      
      await Speech.speak("Hubo un error al buscar la tarea activa. Por favor, intente nuevamente.", {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9
      });
      
      this.recordingState = "idle";
    }
  }

  async askForConfirmation() {
    await Speech.speak(`¿Es correcto el mensaje: ${this.currentNote}? Diga sí o no.`, {
      language: 'es-ES',
      pitch: 1.0,
      rate: 0.9
    });
    
    this.recordingState = "confirming";
    
    // Reiniciar escucha para captar la confirmación
    if (this.usingRealRecognition) {
      setTimeout(() => this.startBackgroundListening(), 500);
    }
  }

  async saveNote() {
    try {
      await Speech.speak("Guardando nota...", {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9
      });
      
      const token = await AsyncStorage.getItem('token');
      
      console.log("Tarea activa:", JSON.stringify(this.activeTask, null, 2));
      
      // Extraer el ID correcto de la tarea (puede ser _id o id)
      const taskId = this.activeTask._id || this.activeTask.id;
      
      console.log("ID de tarea que se va a usar:", taskId);
      console.log("Texto de la nota:", this.currentNote);
      
      // Usar el método simplificado para guardar la nota
      await api.addSimpleVoiceNote(taskId, this.currentNote, token);
      
      // Reproducir confirmación
      await Speech.speak("Nota guardada correctamente.", {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9
      });
      
    } catch (error) {
      console.error("Error guardando nota:", error);
      await Speech.speak("Hubo un error al guardar la nota. Intente nuevamente.", {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9
      });
    } finally {
      // Limpiar el estado
      this.recordingState = "idle";
      this.currentNote = "";
    }
  }

  async cancelNote() {
    await Speech.speak("Nota cancelada.", {
      language: 'es-ES',
      pitch: 1.0,
      rate: 0.9
    });
    
    this.recordingState = "idle";
    this.currentNote = "";
  }

  stop() {
    this.isListening = false;
    
    // Detener cualquier escucha activa
    if (this.usingRealRecognition) {
      try {
        SpeechRecognition.stopListeningAsync();
        
        if (this.recognitionSubscription) {
          this.recognitionSubscription.remove();
          this.recognitionSubscription = null;
        }
      } catch (e) {
        console.error("Error al detener escucha:", e);
      }
    }
    
    // Cancelar cualquier temporizador
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    
    console.log("[Voz] Asistente de voz detenido.");
  }
}

// Exportar una instancia por defecto
const voiceAssistantService = new VoiceAssistantService();
export default voiceAssistantService;

// También exportar la clase para permitir crear instancias personalizadas
export { VoiceAssistantService };
