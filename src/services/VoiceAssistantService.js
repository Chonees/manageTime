import * as Speech from 'expo-speech';
// Importamos Voice de manera compatible con la versión actual
import Voice from '@react-native-voice/voice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from './api';
import { Platform, Alert } from 'react-native';

// Verificar que Voice esté disponible
let voiceAvailable = false;
try {
  // Intentar verificar Voice como un objeto
  voiceAvailable = Voice && typeof Voice === 'object';
  console.log("¿Voice está disponible?", voiceAvailable);
} catch (e) {
  console.log("Error verificando Voice:", e);
}

class VoiceAssistantService {
  constructor() {
    this.isListening = false;
    this.activationKeyword = "bitacora";
    this.recordingState = "idle"; // idle, listening_for_note, confirming
    this.currentNote = "";
    this.activeTask = null;
    
    // Configurar los handlers para Voice si está disponible
    if (voiceAvailable) {
      try {
        Voice.onSpeechStart = this.onSpeechStart.bind(this);
        Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
        Voice.onSpeechResults = this.onSpeechResults.bind(this);
        Voice.onSpeechError = this.onSpeechError.bind(this);
        console.log("Handlers de Voice configurados correctamente");
      } catch (e) {
        console.error("Error configurando handlers de Voice:", e);
      }
    }
    
    // Mantener la simulación como fallback
    this.simulateVoiceRecognition = this.simulateVoiceRecognition.bind(this);
    
    // Indicador de si estamos usando reconocimiento real o simulación
    this.usingRealRecognition = false;
    
    // Control para mostrar o no alertas de inicialización
    this.showInitAlerts = true;
  }

  async initialize() {
    console.log("Inicializando servicio de asistente de voz...");
    
    try {
      // Intentar inicializar el reconocimiento de voz real
      const isVoiceAvailable = await this.checkVoiceAvailability();
      
      // Usar texto a voz para informar al usuario del estado
      if (isVoiceAvailable) {
        this.usingRealRecognition = true;
        await Speech.speak("Asistente de voz iniciado con reconocimiento real. Diga bitácora para activar.", {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9
        });
        
        console.log("Reconocimiento de voz real inicializado correctamente");
        
        // Iniciar la escucha continua
        this.startContinuousListening();
      } else {
        // Fallback a simulación
        this.usingRealRecognition = false;
        await Speech.speak("Asistente de voz iniciado en modo simulación. Use la pantalla de asistente para probar.", {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9
        });
        
        // Solo mostrar alerta si realmente estamos en modo simulación y showInitAlerts está habilitado
        if (this.showInitAlerts) {
          setTimeout(() => {
            Alert.alert(
              "Asistente de Voz",
              "El reconocimiento de voz está en modo simulación porque no está disponible en este dispositivo. Use la pantalla del asistente para probar.",
              [{ text: "Entendido" }]
            );
          }, 1000);
        }
      }
      
      return true;
    } catch (error) {
      console.error("[Voz] Error al inicializar el asistente de voz:", error);
      this.usingRealRecognition = false;
      return false;
    }
  }
  
  async checkVoiceAvailability() {
    try {
      // Verificar si Voice está disponible en la plataforma
      // Nota: En algunos casos Voice.isAvailable() puede causar errores
      // si la API nativa no está disponible
      try {
        if (Voice && typeof Voice.isAvailable === 'function') {
          const isAvailable = await Voice.isAvailable();
          if (!isAvailable) {
            console.log("Voice.isAvailable() devolvió false");
            return false;
          }
        } else {
          console.log("Voice.isAvailable no es una función. Posiblemente no inicializado correctamente");
          return false;
        }
      } catch (error) {
        console.error("Error al llamar Voice.isAvailable():", error);
        return false;
      }
      
      // En iOS y Android necesitamos permisos
      if (Platform.OS !== 'web') {
        try {
          // No llamamos directamente a requestPermissions porque
          // lo manejaremos al iniciar el reconocimiento
          return true;
        } catch (error) {
          console.error("Error al verificar permisos de Voice:", error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error al verificar disponibilidad de Voice:", error);
      return false;
    }
  }
  
  // Iniciar escucha continua (llamado desde initialize)
  async startContinuousListening() {
    if (!this.usingRealRecognition) return;
    
    if (this.isListening) {
      console.log("Ya estamos escuchando, no se reinicia la escucha");
      return;
    }
    
    try {
      console.log("Iniciando escucha continua...");
      this.isListening = true;
      
      // Iniciar reconocimiento en español
      await Voice.start('es-ES');
      
      console.log("Escucha iniciada correctamente");
    } catch (error) {
      console.error("Error al iniciar escucha continua:", error);
      this.isListening = false;
      this.usingRealRecognition = false;
      
      // Mostrar error al usuario si showInitAlerts está habilitado
      if (this.showInitAlerts) {
        Alert.alert(
          "Error de reconocimiento de voz",
          "No se pudo iniciar el reconocimiento de voz. Se usará el modo simulación.",
          [{ text: "Entendido" }]
        );
      }
    }
  }
  
  // Detener la escucha (temporal)
  async stopListening() {
    if (!this.usingRealRecognition || !this.isListening) return;
    
    try {
      await Voice.stop();
      this.isListening = false;
      console.log("Escucha detenida");
    } catch (error) {
      console.error("Error al detener escucha:", error);
    }
  }
  
  // Reiniciar escucha después de una pausa
  async restartListening() {
    if (!this.usingRealRecognition) return;
    
    // Esperar un breve momento para evitar conflictos
    setTimeout(async () => {
      try {
        if (!this.isListening) {
          await Voice.start('es-ES');
          this.isListening = true;
          console.log("Escucha reiniciada");
        }
      } catch (error) {
        console.error("Error al reiniciar escucha:", error);
        this.usingRealRecognition = false;
      }
    }, 1000);
  }
  
  // Callbacks de Voice
  onSpeechStart() {
    console.log("Reconocimiento iniciado");
  }
  
  onSpeechEnd() {
    console.log("Reconocimiento finalizado");
    
    // Reiniciar escucha para modo continuo
    if (this.recordingState === "idle") {
      this.restartListening();
    }
  }
  
  onSpeechResults(event) {
    if (!event.value || event.value.length === 0) return;
    
    // Tomamos la transcripción más probable (la primera)
    const transcription = event.value[0].toLowerCase();
    console.log("Transcripción:", transcription);
    
    // Procesar según el estado actual
    this.processVoiceInput(transcription);
  }
  
  onSpeechError(event) {
    console.error("Error en reconocimiento de voz:", event);
    
    // Reintentar escucha si fue un error temporal
    if (this.recordingState === "idle") {
      this.restartListening();
    }
  }
  
  // Procesar entrada de voz (tanto real como simulada)
  async processVoiceInput(text) {
    console.log(`Procesando entrada de voz: "${text}" (Estado: ${this.recordingState})`);
    
    // Convertir a minúsculas para comparaciones
    const lowerText = text.toLowerCase().trim();
    
    // Estado: esperando palabra de activación
    if (this.recordingState === "idle") {
      // Detección de palabra clave
      if (lowerText.includes(this.activationKeyword)) {
        console.log("Palabra clave detectada: bitacora");
        
        // Si estamos usando reconocimiento real, pausamos brevemente
        if (this.usingRealRecognition) {
          await this.stopListening();
        }
        
        // Buscar tarea activa
        await this.findActiveTask();
      }
    }
    // Estado: grabando nota
    else if (this.recordingState === "listening_for_note") {
      // Guardar la nota
      this.currentNote = text;
      console.log("Nota grabada:", this.currentNote);
      
      // Si estamos usando reconocimiento real, pausamos brevemente
      if (this.usingRealRecognition) {
        await this.stopListening();
      }
      
      // Solicitar confirmación
      await this.askForConfirmation();
    }
    // Estado: esperando confirmación
    else if (this.recordingState === "confirming") {
      // Buscar si/no en la respuesta
      if (lowerText.includes("sí") || lowerText.includes("si") || lowerText === "sí" || lowerText === "si") {
        console.log("Confirmación recibida: SÍ");
        
        // Si estamos usando reconocimiento real, pausamos
        if (this.usingRealRecognition) {
          await this.stopListening();
        }
        
        // Guardar la nota
        await this.saveNote();
      }
      else if (lowerText.includes("no") || lowerText === "no") {
        console.log("Confirmación recibida: NO");
        
        // Si estamos usando reconocimiento real, pausamos
        if (this.usingRealRecognition) {
          await this.stopListening();
        }
        
        // Cancelar la grabación
        await this.cancelNote();
      }
      else {
        console.log("Respuesta no reconocida como confirmación:", lowerText);
        
        // Repetir la solicitud
        await this.askForConfirmation();
      }
    }
    
    // Si estamos usando reconocimiento real y estamos en estado idle,
    // asegurarnos de que la escucha está activa
    if (this.usingRealRecognition && this.recordingState === "idle") {
      this.restartListening();
    }
  }

  // Esta función mantiene la simulación de reconocimiento como respaldo
  async simulateVoiceRecognition(simulatedText) {
    console.log("Simulando reconocimiento de voz:", simulatedText);
    
    // Procesar de la misma manera que el reconocimiento real
    await this.processVoiceInput(simulatedText);
  }

  async findActiveTask() {
    try {
      await Speech.speak("Verificando tarea activa...", {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9
      });
      
      // Obtener token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        await Speech.speak("No hay sesión activa. Por favor inicie sesión en la aplicación.", {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9
        });
        this.recordingState = "idle";
        return;
      }
      
      // Verificar si hay una tarea activa
      try {
        const activeTask = await api.getActiveTask(token);
        
        if (!activeTask) {
          await Speech.speak("No hay ninguna tarea activa en este momento. Asegúrate de que la tarea tenga habilitado el modo manos libres y esté en estado en progreso.", {
            language: 'es-ES',
            pitch: 1.0,
            rate: 0.9
          });
          this.recordingState = "idle";
          return;
        }
        
        // Guardar tarea activa
        this.activeTask = activeTask;
        
        // Informar al usuario y comenzar a escuchar la nota
        await Speech.speak(`Tarea activa: ${activeTask.title}. Por favor, dicte su mensaje después del tono.`, {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9
        });
        
        // Reproducir un tono después de una pausa
        setTimeout(async () => {
          await Speech.speak("beep", { pitch: 1.5, rate: 1.2 });
          this.recordingState = "listening_for_note";
        }, 2000);
        
      } catch (apiError) {
        console.error("[Voz] Error al obtener tarea activa:", apiError);
        await Speech.speak("No se pudo obtener la tarea activa. Verifica la conexión con el servidor.", {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9
        });
        this.recordingState = "idle";
      }
      
    } catch (error) {
      console.error("[Voz] Error general verificando tarea activa:", error);
      await Speech.speak("Hubo un error al verificar la tarea activa. Intente nuevamente.", {
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
      
      // Extraer el ID correcto de la tarea (puede ser _id o id)
      const taskId = this.activeTask._id || this.activeTask.id;
      
      console.log("ID de tarea que se va a usar:", taskId);
      console.log("Texto de la nota:", this.currentNote);
      
      // Usar el nuevo método simplificado para guardar la nota
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
    console.log("[Voz] Asistente de voz detenido.");
  }
}

// Exportar una instancia por defecto
const voiceAssistantService = new VoiceAssistantService();
export default voiceAssistantService;

// También exportar la clase para permitir crear instancias personalizadas
export { VoiceAssistantService };
