import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, Text, KeyboardAvoidingView, Platform } from 'react-native';
import Header from '../components/Header';
import TaskItem from '../components/TaskItem';
import LocationComponent from '../components/LocationComponent';

const TaskScreen = () => {
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState('');
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  const handleLocationPermissionChange = (isGranted) => {
    setLocationPermissionGranted(isGranted);
  };

  const addTask = () => {
    if (taskText.trim() !== '') {
      const newTask = {
        id: Date.now().toString(),
        title: taskText.trim(),
      };
      setTasks([...tasks, newTask]);
      setTaskText('');
    }
  };

  const deleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  // Render the location permission screen if permission is not granted
  if (!locationPermissionGranted) {
    return (
      <View style={styles.container}>
        <Header title="Task Manager" />
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Permiso de Ubicación Requerido</Text>
          <Text style={styles.permissionText}>
            Esta aplicación requiere acceso a tu ubicación para funcionar correctamente.
            Por favor, concede el permiso de ubicación para continuar.
          </Text>
          <LocationComponent onLocationPermissionChange={handleLocationPermissionChange} />
        </View>
      </View>
    );
  }

  // Render the task management interface if permission is granted
  return (
    <View style={styles.container}>
      <Header title="Task Manager" />
      <LocationComponent onLocationPermissionChange={handleLocationPermissionChange} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.taskInputContainer}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add a new task..."
            value={taskText}
            onChangeText={setTaskText}
          />
          <TouchableOpacity style={styles.addButton} onPress={addTask}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      
      <FlatList
        data={tasks}
        renderItem={({ item }) => (
          <TaskItem task={item} onDelete={deleteTask} />
        )}
        keyExtractor={item => item.id}
        style={styles.taskList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  permissionContainer: {
    flex: 1,
    padding: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  taskInputContainer: {
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#fff',
  },
  addButton: {
    marginLeft: 10,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  taskList: {
    flex: 1,
  },
});

export default TaskScreen;