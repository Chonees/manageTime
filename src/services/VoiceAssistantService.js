import * as Speech from 'expo-speech';
// No importamos ExpoSpeechRecognition para evitar errores
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from './api';
import { Platform, Alert } from 'react-native';

// Constantes para el modo de funcionamiento
const MODE = {
  SIMULATION: 'simulation',    // Para pruebas vía UI
  AUTO_ACTIVATION: 'auto'      // Para activación automática por voz (requiere build de desarrollo)
};

class VoiceAssistantService {
  constructor() {
    this.isListening = false;
    this.activationKeyword = "bitacora";
    this.recordingState = "idle"; // idle, listening_for_note, confirming
    this.currentNote = "";
    this.activeTask = null;
    
    // Control para mostrar o no alertas
    this.showInitAlerts = true;
    
    // Forzar modo de simulación debido a limitaciones de Expo Go
    this.mode = MODE.SIMULATION;
    
    // Temporizador para recordatorios
    this.reminderInterval = null;
    
    console.log("VoiceAssistantService inicializado en modo SIMULACIÓN (compatible con Expo Go)");
  }

  async initialize() {
    console.log("Inicializando servicio de asistente de voz...");
    
    try {
      // En Expo Go solo podemos usar el modo simulación
      this.mode = MODE.SIMULATION;
      console.log("Usando modo simulación debido a restricciones de Expo Go");
      
      // Informar al usuario
      await Speech.speak("Asistente de voz activado en modo simulación. Use la pantalla de Asistente de Voz para grabación de notas.", {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9
      });
      
      if (this.showInitAlerts) {
        setTimeout(() => {
          Alert.alert(
            "Asistente de Voz - Modo Compatible",
            "Para usar el asistente de voz completamente manos libres, se requiere una build de desarrollo. Por ahora, use la pantalla del Asistente de Voz para dictar notas con los botones.",
            [
              { 
                text: "Entendido" 
              },
              {
                text: "¿Cómo usar?",
                onPress: () => {
                  Alert.alert(
                    "Cómo usar el Asistente de Voz",
                    "1. Ve a la pantalla 'Asistente de Voz'\n2. Presiona 'Simular bitácora'\n3. Habla tu nota\n4. Confirma con 'Simular sí'",
                    [{ text: "OK" }]
                  );
                }
              }
            ]
          );
        }, 1000);
      }
      
      // Iniciar recordatorios periódicos si está en tareas
      this.startTaskReminders();
      
      return true;
    } catch (error) {
      console.error("Error al inicializar asistente de voz:", error);
      return false;
    }
  }
  
  // Recordatorios periódicos para usar el asistente
  startTaskReminders() {
    // Recordar al usuario cada cierto tiempo que puede usar el asistente
    this.reminderInterval = setInterval(async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        
        // Verificar si hay una tarea activa
        const activeTask = await api.getActiveTask(token);
        if (activeTask && activeTask.id) {
          console.log("Tarea activa detectada, mostrando recordatorio");
          
          // Mostrar recordatorio sutil
          Alert.alert(
            "Recordatorio",
            `Tienes la tarea "${activeTask.title}" activa. ¿Quieres grabar una nota?`,
            [
              {
                text: "No ahora",
                style: "cancel"
              },
              {
                text: "Ir al Asistente",
                onPress: () => {
                  // Idealmente navegaríamos a la pantalla del asistente
                  // pero como no tenemos acceso directo a la navegación,
                  // solo mostraremos cómo usarlo
                  Alert.alert(
                    "Usar Asistente de Voz",
                    "Ve a la pantalla 'Asistente de Voz' y presiona 'Simular bitácora' para empezar a grabar una nota.",
                    [{ text: "OK" }]
                  );
                }
              }
            ],
            { cancelable: true }
          );
        }
      } catch (e) {
        console.log("Error en recordatorio:", e);
      }
    }, 30 * 60 * 1000); // Cada 30 minutos
  }
  
  // Simular reconocimiento de voz (compatible con Expo Go)
  async simulateVoiceRecognition(simulatedText) {
    console.log("Simulando reconocimiento de voz:", simulatedText);
    
    // Procesar la entrada simulada
    await this.processVoiceInput(simulatedText);
  }
  
  // Procesar entrada de voz (desde simulación)
  async processVoiceInput(text) {
    console.log(`Procesando entrada de voz: "${text}" (Estado: ${this.recordingState})`);
    
    // Convertir a minúsculas para comparaciones
    const lowerText = text.toLowerCase().trim();
    
    // Estado: esperando palabra de activación
    if (this.recordingState === "idle") {
      // Detectar palabra clave
      if (lowerText.includes(this.activationKeyword)) {
        console.log("Palabra clave detectada: bitacora");
        await this.findActiveTask();
      }
    }
    // Estado: grabando nota
    else if (this.recordingState === "listening_for_note") {
      this.currentNote = text;
      console.log("Nota grabada:", this.currentNote);
      await this.askForConfirmation();
    }
    // Estado: esperando confirmación
    else if (this.recordingState === "confirming") {
      if (lowerText.includes("sí") || lowerText.includes("si") || lowerText === "sí" || lowerText === "si") {
        console.log("Confirmación recibida: SÍ");
        await this.saveNote();
      }
      else if (lowerText.includes("no") || lowerText === "no") {
        console.log("Confirmación recibida: NO");
        await this.cancelNote();
      }
      else {
        console.log("Respuesta no reconocida como confirmación:", lowerText);
        await this.askForConfirmation();
      }
    }
  }

  async findActiveTask() {
    try {
      await Speech.speak("Verificando tarea activa...", {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9
      });
      
      const token = await AsyncStorage.getItem('token');
      
      // Buscar tarea activa
      const activeTaskResponse = await api.getActiveTask(token);
      
      if (activeTaskResponse && activeTaskResponse.id) {
        this.activeTask = activeTaskResponse;
        
        // Cambiar estado y solicitar nota
        this.recordingState = "listening_for_note";
        
        await Speech.speak(`Tarea activa encontrada: ${this.activeTask.title}. Por favor, dicte su mensaje después del tono.`, {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9
        });
        
        // Reproducir tono después de breve pausa
        setTimeout(async () => {
          await Speech.speak("beep", { pitch: 1.5, rate: 1.2 });
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
      
      // Extraer ID de tarea (puede ser _id o id)
      const taskId = this.activeTask._id || this.activeTask.id;
      
      console.log("ID de tarea que se va a usar:", taskId);
      console.log("Texto de la nota:", this.currentNote);
      
      // Guardar nota
      await api.addSimpleVoiceNote(taskId, this.currentNote, token);
      
      // Confirmar guardado
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
      // Limpiar estado
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
    // Detener cualquier temporizador
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
    
    console.log("[Voz] Asistente de voz detenido.");
  }
}

// Exportar una instancia por defecto
const voiceAssistantService = new VoiceAssistantService();
export default voiceAssistantService;

// También exportar la clase para permitir crear instancias personalizadas
export { VoiceAssistantService };
