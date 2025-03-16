import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

const TaskScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Cargar tareas
  const loadTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      // Usar getUserTasks para usuarios normales y getTasks para administradores
      const tasksData = user?.isAdmin 
        ? await api.getTasks() 
        : await api.getUserTasks();
      
      setTasks(tasksData);
    } catch (error) {
      console.error('Error al cargar tareas:', error);
      setError(error.message || 'Error al cargar tareas');
      Alert.alert('Error', error.message || 'Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  };

  // Cargar tareas al montar el componente
  useEffect(() => {
    loadTasks();
  }, []);

  // Añadir nueva tarea
  const addTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título para la tarea');
      return;
    }

    try {
      const result = await api.saveTask({ 
        title: newTaskTitle,
        description: newTaskDescription 
      });
      
      setTasks([...tasks, result.task]);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error al añadir tarea:', error);
      Alert.alert('Error', error.message || 'Error al añadir tarea');
    }
  };

  // Eliminar tarea
  const deleteTask = async (taskId) => {
    try {
      await api.deleteTask(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      Alert.alert('Error', error.message || 'Error al eliminar tarea');
    }
  };

  // Confirmar eliminación de tarea
  const confirmDeleteTask = (taskId) => {
    Alert.alert(
      'Confirmar Eliminación',
      '¿Estás seguro de que deseas eliminar esta tarea?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteTask(taskId) }
      ]
    );
  };

  // Alternar estado de completado
  const toggleComplete = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  // Renderizar cada tarea
  const renderTask = ({ item }) => (
    <View style={styles.taskItem}>
      <TouchableOpacity 
        style={styles.taskCheckbox}
        onPress={() => toggleComplete(item.id)}
      >
        <Ionicons 
          name={item.completed ? 'checkbox' : 'square-outline'} 
          size={24} 
          color={item.completed ? '#4CAF50' : '#757575'} 
        />
      </TouchableOpacity>
      
      <View style={styles.taskContent}>
        <Text 
          style={[
            styles.taskTitle, 
            item.completed && styles.taskCompleted
          ]}
        >
          {item.title}
        </Text>
        
        {item.description ? (
          <Text 
            style={[
              styles.taskDescription, 
              item.completed && styles.taskCompleted
            ]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}
      </View>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => confirmDeleteTask(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#F44336" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {!showAddForm ? (
        <TouchableOpacity 
          style={styles.addTaskButton}
          onPress={() => setShowAddForm(true)}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addTaskButtonText}>Añadir Nueva Tarea</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Título de la tarea"
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
          />
          
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descripción (opcional)"
            value={newTaskDescription}
            onChangeText={setNewTaskDescription}
            multiline
            numberOfLines={3}
          />
          
          <View style={styles.formButtons}>
            <TouchableOpacity 
              style={[styles.formButton, styles.cancelButton]}
              onPress={() => {
                setShowAddForm(false);
                setNewTaskTitle('');
                setNewTaskDescription('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.formButton, styles.saveButton]}
              onPress={addTask}
            >
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Cargando tareas...</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{tasks.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {tasks.filter(task => !task.completed).length}
              </Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {tasks.filter(task => task.completed).length}
              </Text>
              <Text style={styles.statLabel}>Completadas</Text>
            </View>
          </View>
          
          <FlatList
            data={tasks}
            renderItem={renderTask}
            keyExtractor={(item) => item.id.toString()}
            style={styles.taskList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay tareas disponibles</Text>
                <Text style={styles.emptySubtext}>
                  Añade una nueva tarea usando el botón de arriba
                </Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  formButton: {
    flex: 0.48,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  addTaskButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  errorText: {
    color: '#F44336',
    marginBottom: 15,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  taskList: {
    flex: 1,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskCheckbox: {
    marginRight: 10,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    color: '#333',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  deleteButton: {
    padding: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default TaskScreen;