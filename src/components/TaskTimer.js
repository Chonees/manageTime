import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';

const TaskTimer = ({ task, onTimeExpired }) => {
  const [remainingTime, setRemainingTime] = useState(null);
  const timerIntervalRef = useRef(null);
  
  // Formatear el tiempo restante en formato hh:mm:ss
  const formatRemainingTime = (ms) => {
    if (ms === null) return '';
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Iniciar el temporizador
  const startTaskTimer = (storedEndTime) => {
    if (!task) {
      console.log("No se puede iniciar el temporizador: tarea no disponible");
      return;
    }
    
    console.log('⏰ Iniciando temporizador para tarea con ID:', task._id);
    console.log('Estado actual de la tarea:', task.status);
    
    // Verificar si la tarea tiene tiempo límite (puede ser número o string)
    const timeLimitValue = task.timeLimit ? 
      (typeof task.timeLimit === 'string' ? Number(task.timeLimit) : task.timeLimit) : null;
    
    if (!timeLimitValue) {
      console.log("No se encontró campo timeLimit en la tarea");
      // No mostrar temporizador si no hay tiempo límite
      setRemainingTime(null);
      return;
    }
    
    // Verificar si hay un tiempo final almacenado (esto indica persistencia)
    if (storedEndTime) {
      console.log(`Se encontró un tiempo final almacenado: ${new Date(parseInt(storedEndTime)).toLocaleString()}`);
      // Si hay un tiempo final almacenado, continuamos con la configuración del temporizador
      // independientemente del estado de timeLimitSet
    }
    // Si no hay tiempo final almacenado, verificar si hay fecha de inicio del temporizador
    else if (!task.timeLimitSet) {
      console.log("No se encontró fecha de inicio del temporizador");
      console.log("El temporizador solo debe iniciar cuando la tarea es aceptada");
      
      // Si la tarea ha sido aceptada pero no tiene timeLimitSet, actualizarlo
      if (task.acceptedAt || ['accepted', 'on_the_way', 'on_site'].includes(task.status)) {
        console.log("La tarea está aceptada pero no tiene timeLimitSet, actualizando...");
        task.timeLimitSet = new Date().toISOString();
        
        // Intentar actualizar en el backend
        try {
          api.updateTask(task._id, { timeLimitSet: task.timeLimitSet })
            .then(updatedTask => {
              console.log('✅ TimeLimitSet actualizado en el servidor:', updatedTask.timeLimitSet);
            })
            .catch(error => {
              console.error('❌ Error al actualizar timeLimitSet en el servidor:', error);
            });
        } catch (error) {
          console.error('Error al intentar actualizar timeLimitSet:', error);
        }
      } else {
        // Si la tarea no está aceptada, no mostrar temporizador
        setRemainingTime(null);
        return;
      }
    }
    
    console.log(`🕐 Iniciando temporizador: Límite de ${timeLimitValue} minutos, establecido en ${task.timeLimitSet}`);
    
    // Limpiar cualquier temporizador existente
    if (timerIntervalRef.current) {
      console.log('🗑️ Limpiando temporizador existente antes de iniciar uno nuevo');
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Calcular el tiempo restante en milisegundos
    let endTime;
    const currentTime = new Date().getTime();
    
    if (storedEndTime) {
      // Si tenemos un tiempo almacenado, usarlo
      endTime = storedEndTime;
      console.log(`⏰ Usando tiempo final almacenado: ${new Date(endTime).toLocaleString()}`);
    } else {
      // Calcularlo desde el inicio
      const timeLimitMs = timeLimitValue * 60 * 1000; // Convertir minutos a milisegundos
      const startTime = new Date(task.timeLimitSet).getTime();
      endTime = startTime + timeLimitMs;
      console.log(`📈 Calculando nuevo tiempo final: ${new Date(endTime).toLocaleString()}`);
    }
    
    console.log(`⭐ Temporizador: Fin ${new Date(endTime).toLocaleString()}, Ahora ${new Date(currentTime).toLocaleString()}`);
    
    // Si ya se pasó el tiempo límite, notificar inmediatamente
    if (currentTime >= endTime) {
      console.log("⛔ El tiempo ya expiró, notificando...");
      if (onTimeExpired) onTimeExpired();
      return;
    }
    
    // Establecer el tiempo restante inicial (basado en el tiempo que ya ha transcurrido)
    const initialRemainingTime = endTime - currentTime;
    console.log(`⏱ Tiempo restante inicial: ${formatRemainingTime(initialRemainingTime)}`);
    
    // Asegurar que remainingTime se establezca correctamente
    console.log('Estableciendo remainingTime:', initialRemainingTime);
    setRemainingTime(initialRemainingTime);
    
    // Guardar en el estado de la aplicación para depuración
    try {
      AsyncStorage.setItem('lastRemainingTime', initialRemainingTime.toString());
    } catch (e) {
      console.error('Error guardando lastRemainingTime:', e);
    }
    
    // Guardar tiempo de fin en localStorage para persistencia
    try {
      const startTime = new Date(task.timeLimitSet).getTime();
      // Guardar datos completos para mejor persistencia
      AsyncStorage.multiSet([
        [`task_${task._id}_end_time`, endTime.toString()],
        [`task_${task._id}_timer_active`, 'true'],
        [`task_${task._id}_task_status`, task.status],
        [`task_${task._id}_start_time`, startTime.toString()],
        [`task_${task._id}_time_limit`, timeLimitValue.toString()],
        [`task_${task._id}_initial_remaining`, initialRemainingTime.toString()]
      ]);
      console.log(`💾 Datos completos del temporizador guardados: endTime=${endTime}, startTime=${startTime}`);
      
      // Actualizar también en el backend para doble seguridad
      if (!task.timeLimitSet) {
        api.updateTask(task._id, { 
          timeLimitSet: new Date(startTime).toISOString(),
          timeLimit: timeLimitValue
        })
        .then(() => console.log('Datos del temporizador actualizados en el backend'))
        .catch(err => console.error('Error actualizando datos en el backend:', err));
      }
    } catch (error) {
      console.error('❌ Error al guardar datos del temporizador:', error);
    }
    
    // Actualizar el tiempo restante cada segundo
    timerIntervalRef.current = setInterval(() => {
      const now = new Date().getTime();
      const timeLeft = endTime - now;
      
      if (timeLeft <= 0) {
        // Tiempo agotado
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        setRemainingTime(0);
        
        // Notificar que el tiempo ha expirado
        if (onTimeExpired) {
          onTimeExpired();
        }
        
        // Limpiar datos del temporizador en AsyncStorage
        try {
          AsyncStorage.multiRemove([
            `task_${task._id}_end_time`,
            `task_${task._id}_timer_active`,
            `task_${task._id}_task_status`,
            `task_${task._id}_start_time`,
            `task_${task._id}_time_limit`,
            `task_${task._id}_initial_remaining`
          ]);
          console.log('Todos los datos del temporizador limpiados de AsyncStorage');
        } catch (cleanupError) {
          console.error('Error al limpiar datos del temporizador:', cleanupError);
        }
      } else {
        setRemainingTime(timeLeft);
      }
    }, 1000);
  };
  
  // Detener el temporizador
  const stopTaskTimer = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Limpiar datos del temporizador en AsyncStorage
    try {
      await AsyncStorage.multiRemove([
        `task_${task._id}_end_time`,
        `task_${task._id}_timer_active`,
        `task_${task._id}_task_status`,
        `task_${task._id}_start_time`,
        `task_${task._id}_time_limit`,
        `task_${task._id}_initial_remaining`
      ]);
      console.log('Estado del temporizador limpiado en AsyncStorage');
    } catch (e) {
      console.error('Error al limpiar estado del temporizador:', e);
    }
  };
  
  // Efecto para manejar el ciclo de vida del componente
  useEffect(() => {
    console.log('TaskTimer montado con tarea:', task?._id);
    
    // Verificar si hay un temporizador guardado
    const checkSavedTimer = async () => {
      try {
        if (!task) return;
        
        const storedEndTime = await AsyncStorage.getItem(`task_${task._id}_end_time`);
        const timerActive = await AsyncStorage.getItem(`task_${task._id}_timer_active`);
        const taskStatus = await AsyncStorage.getItem(`task_${task._id}_task_status`);
        
        console.log('Estado guardado del temporizador:', {
          taskId: task._id,
          storedEndTime,
          timerActive,
          taskStatus,
          currentStatus: task.status
        });
        
        // Si hay un temporizador guardado y activo, restaurarlo independientemente del estado
        if (storedEndTime && timerActive === 'true') {
          console.log(`⏰ Restaurando temporizador guardado con tiempo final: ${storedEndTime}`);
          startTaskTimer(parseInt(storedEndTime, 10));
        } 
        // Si no hay temporizador guardado pero la tarea ha sido aceptada o estaba en un estado avanzado
        else if (task.acceptedAt || ['accepted', 'on_the_way', 'on_site'].includes(task.status)) {
          console.log(`⏱ Iniciando temporizador para tarea aceptada con estado ${task.status}`);
          
          // Verificar que la tarea tenga timeLimitSet (establecido cuando se aceptó)
          if (task.timeLimitSet && task.timeLimit) {
            console.log('La tarea tiene timeLimitSet desde:', new Date(task.timeLimitSet).toLocaleString());
            startTaskTimer();
          } else if (task.timeLimit) {
            // Si tiene aceptación pero no timeLimitSet, actualizar en el backend
            console.log('Tarea aceptada pero sin timeLimitSet, actualizando...');
            const now = new Date().toISOString();
            
            try {
              api.updateTask(task._id, { timeLimitSet: now })
                .then(() => {
                  console.log('TimeLimitSet actualizado en el backend');
                  // Actualizar localmente y comenzar el temporizador
                  task.timeLimitSet = now;
                  startTaskTimer();
                })
                .catch(err => console.error('Error actualizando timeLimitSet:', err));
            } catch (e) {
              console.error('Error al intentar actualizar timeLimitSet:', e);
            }
          }
        }
      } catch (e) {
        console.error('Error verificando temporizador guardado:', e);
      }
    };
    
    checkSavedTimer();
    
    // Limpiar temporizador al desmontar el componente
    return () => {
      console.log('TaskTimer desmontado, limpiando recursos');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [task]); // Solo se ejecuta cuando cambia la tarea
  
  // Si no hay una tarea, no mostrar nada
  if (!task) {
    return null;
  }
  
  // Renderizar el temporizador
  return (
    <>
      {remainingTime !== null ? (
        <View style={[
          styles.timerContainer, 
          remainingTime < 300000 ? styles.timerWarning : null  // Rojo cuando quedan menos de 5 minutos
        ]}>
          <Ionicons name="timer-outline" size={24} color={remainingTime < 300000 ? "#FF5252" : "#fff3e5"} />
          <Text style={[
            styles.timerText, 
            remainingTime < 300000 ? styles.timerTextWarning : null
          ]}>
            {formatRemainingTime(remainingTime)}
          </Text>
          <Text style={styles.timerLabel}>
            {remainingTime < 300000 
              ? 'Tiempo agotándose!'
              : 'Tiempo restante'}
          </Text>
        </View>
      ) : task && task.timeLimit ? (
        <View style={styles.debugTimer}>
          <Text style={styles.debugTimerText}>
            {task.acceptedAt || task.status === 'accepted'
              ? 'Iniciando temporizador...'
              : 'Temporizador iniciará cuando aceptes la tarea'}
          </Text>
        </View>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    backgroundColor: '#363636',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    color: '#fff3e5',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  timerWarning: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: '#FF3B30',
  },
  timerWarningText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginLeft: 10,
  },
  timerTextWarning: {
    color: '#FF5252',
  },
  timerLabel: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginLeft: 10,
  },
  debugTimer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    marginBottom: 15, 
    borderRadius: 8,
    alignItems: 'center',
  },
  debugTimerText: {
    color: '#FF9800',
    fontSize: 14,
  },
});

export default TaskTimer;
