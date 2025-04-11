import * as Speech from 'expo-speech';
// Comentamos la importación que está causando el error y usamos una simulación mejorada
// import * as SpeechRecognition from 'expo-speech-recognition';
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
    
    // Simulación mejorada para desarrollo hasta que se resuelva el problema con expo-speech-recognition
    this.simulateVoiceRecognition = this.simulateVoiceRecognition.bind(this);
  }

  async initialize() {
    console.log("Inicializando servicio de asistente de voz...");
    
    try {
      // Usar texto a voz para informar al usuario del estado
      await Speech.speak("Asistente de voz iniciado. Diga bitácora para activar.", {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9
      });
      
      // Mostrar alerta informativa sobre el modo de simulación
      setTimeout(() => {
        Alert.alert(
          "Asistente de Voz",
          "El reconocimiento de voz está en modo simulación debido a un problema técnico. Para probar la funcionalidad, usa la pantalla de 'Asistente de Voz' en el menú.",
          [{ text: "Entendido" }]
        );
      }, 1000);
      
      return true;
    } catch (error) {
      console.error("[Voz] Error al inicializar el asistente de voz:", error);
      return false;
    }
  }

  // Esta función simula el reconocimiento de voz hasta que se resuelva el problema con el módulo nativo
  async simulateVoiceRecognition(simulatedText) {
    console.log("Simulando reconocimiento de voz:", simulatedText);
    
    if (this.recordingState === "idle") {
      // Detectar palabra clave
      if (simulatedText.toLowerCase().includes(this.activationKeyword)) {
        await Speech.speak("Activando asistente", {
          language: 'es-ES',
          pitch: 1.2,
          rate: 0.9
        });
        
        await this.checkForActiveTask();
      }
    } 
    else if (this.recordingState === "listening_for_note") {
      // Capturar la nota
      this.currentNote = simulatedText;
      this.recordingState = "confirming";
      
      // Leer el texto detectado
      await Speech.speak(`¿Es correcto el mensaje: ${this.currentNote}? Diga sí o no.`, {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9
      });
    } 
    else if (this.recordingState === "confirming") {
      // Verificar confirmación
      const lowercaseText = simulatedText.toLowerCase();
      if (lowercaseText.includes("si") || 
          lowercaseText.includes("sí") || 
          lowercaseText.includes("yes") || 
          lowercaseText.includes("correcto")) {
        await this.saveNote();
      } 
      else if (lowercaseText.includes("no") || 
              lowercaseText.includes("incorrecto")) {
        await Speech.speak("Vamos a intentarlo de nuevo. Por favor, dicte su mensaje después del tono.", {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.9
        });
        
        // Reproducir un tono
        setTimeout(async () => {
          await Speech.speak("beep", { pitch: 1.5, rate: 1.2 });
          this.recordingState = "listening_for_note";
        }, 1000);
      }
    }
  }

  async checkForActiveTask() {
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

  stop() {
    this.isListening = false;
    console.log("[Voz] Asistente de voz detenido.");
  }
}

// Instancia singleton
const voiceAssistant = new VoiceAssistantService();

export default voiceAssistant;
