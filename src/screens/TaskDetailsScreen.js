import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import * as api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VoiceListener from '../components/VoiceListener'; // Importar el componente de escucha de voz

const TaskDetailsScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignedUser, setAssignedUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [taskStarted, setTaskStarted] = useState(false);
  const [locationWatcher, setLocationWatcher] = useState(null);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [activityInput, setActivityInput] = useState('');
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);
  const [taskActivities, setTaskActivities] = useState([]);

  useEffect(() => {
    loadTaskDetails();

    return () => {
      if (locationSubscription) {
        Location.removeWatchAsync(locationSubscription);
      }
    };
  }, [taskId]);

  // Start location tracking when task data is loaded
  useEffect(() => {
    if (task) {
      startLocationTracking();
    }
  }, [task]);

  const startLocationTracking = async () => {
    try {
      // Verify task has location data before starting tracking
      if (!task?.location?.coordinates || task.location.coordinates.length !== 2) {
        console.error('Cannot start location tracking: Task is missing valid coordinates');
        Alert.alert(
          t('error'),
          t('taskMissingLocation'),
          [{ text: t('ok') }]
        );
        return;
      }
      
      console.log(t('startingLocationTracking'));
      
      // Request permissions first
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error(t('locationPermissionDenied'));
        Alert.alert(
          t('error'),
          t('locationPermissionDenied'),
          [{ text: t('ok') }]
        );
        return;
      }
      
      // Try multiple approaches to get location
      let initialLocation = null;
      
      try {
        // First try with high accuracy
        console.log('Trying high accuracy location...');
        initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
          maximumAge: 1000,
          timeout: 10000
        });
        console.log('Successfully got high accuracy location');
      } catch (highAccError) {
        console.error('High accuracy location failed:', highAccError);
        
        try {
          // Try with balanced accuracy
          console.log('Trying balanced accuracy location...');
          initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            maximumAge: 5000,
            timeout: 15000
          });
          console.log('Successfully got balanced accuracy location');
        } catch (balancedError) {
          console.error('Balanced accuracy location failed:', balancedError);
          
          try {
            // Try with low accuracy
            console.log('Trying low accuracy location...');
            initialLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
              maximumAge: 10000,
              timeout: 20000
            });
            console.log('Successfully got low accuracy location');
          } catch (lowAccError) {
            console.error('All location attempts failed:', lowAccError);
            
            // Try to use device's last known location
            try {
              console.log('Trying to get last known position from device...');
              const lastKnownPosition = await Location.getLastKnownPositionAsync();
              if (lastKnownPosition) {
                console.log('Using last known position from device');
                initialLocation = lastKnownPosition;
              } else {
                console.log('No last known position available on device');
                throw new Error('No last known position available');
              }
            } catch (lastKnownError) {
              console.error('Failed to get last known position:', lastKnownError);
              
              // Last resort - try to use stored location from AsyncStorage
              try {
                console.log('Trying to retrieve stored location from AsyncStorage...');
                const storedLocationString = await AsyncStorage.getItem('lastKnownLocation');
                if (storedLocationString) {
                  const storedLocation = JSON.parse(storedLocationString);
                  console.log('Using stored location:', storedLocation);
                  
                  // Create a location object in the format expected
                  initialLocation = {
                    coords: storedLocation.coords,
                    timestamp: new Date(storedLocation.timestamp).getTime()
                  };
                }
              } catch (storageError) {
                console.error('Failed to retrieve stored location:', storageError);
              }
            }
          }
        }
      }
      
      if (initialLocation) {
      console.log(t('initialLocationReading'));
      setUserLocation(initialLocation.coords);
      checkIfWithinTaskRadius(initialLocation.coords);
      
        // Store successful location for future use
        try {
          await AsyncStorage.setItem('lastKnownLocation', JSON.stringify({
            coords: initialLocation.coords,
            timestamp: new Date().toISOString()
          }));
        } catch (storageError) {
          console.warn('Could not save last known location:', storageError);
        }
      } else {
        console.error('Failed to get any location');
        Alert.alert(
          t('error'),
          t('locationServicesHelp'),
          [{ text: t('ok') }]
        );
      }
      
      // Set up continuous tracking with more robust options
      console.log(t('settingUpLocationTracking'));
      
      const watchOptions = {
          accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 3000,
        mayShowUserSettingsDialog: true
      };
      
      console.log('Watch position options:', watchOptions);
      
      const subscription = await Location.watchPositionAsync(
        watchOptions,
        (locationUpdate) => {
          console.log(t('locationUpdateReceived'));
          console.log(t('locationCoordinates', {
            lat: locationUpdate.coords.latitude.toFixed(6),
            lng: locationUpdate.coords.longitude.toFixed(6),
            accuracy: Math.round(locationUpdate.coords.accuracy)
          }));
          
          setUserLocation(locationUpdate.coords);
          checkIfWithinTaskRadius(locationUpdate.coords);
          
          // Update stored location
          try {
            AsyncStorage.setItem('lastKnownLocation', JSON.stringify({
              coords: locationUpdate.coords,
              timestamp: new Date().toISOString()
            }));
          } catch (storageError) {
            console.warn('Could not update stored location:', storageError);
          }
        }
      );
      
      setIsLocationTracking(true);
      setLocationSubscription(subscription);
      console.log(t('locationTrackingStarted'));
    } catch (error) {
      console.error(`${t('locationTrackingError').replace('${error}', error.message)}`);
      Alert.alert(
        t('error'),
        t('locationTrackingError').replace('${error}', error.message),
        [{ text: t('ok') }]
      );
    }
  };

  const checkIfWithinTaskRadius = (userCoords) => {
    console.log(t('radiusCheckDivider'));
    
    // Skip check if task isn't loaded yet
    if (!task) {
      console.log('Task data not loaded yet, skipping radius check');
      return;
    }
    
    console.log(t('checkingTaskRadius', { taskId: task._id }));
    
    // Validate task has location data
    if (!task?.location?.coordinates || task.location.coordinates.length !== 2) {
      console.error(t('taskMissingCoordinates', { location: JSON.stringify(task?.location) }));
      setIsWithinRadius(false);
      return;
    }
    
    // Get task data
    const taskCoords = {
      latitude: task.location.coordinates[1],
      longitude: task.location.coordinates[0]
    };
    
    const taskRadius = task.radius || 0.1; // Default to 0.1km if not specified
    console.log(t('taskPosition', { position: JSON.stringify(taskCoords) }));
    console.log(t('taskRadius', { radius: taskRadius }));
    console.log(t('userPosition', { position: JSON.stringify(userCoords) }));
    
    // Calculate distance
    const distanceInKm = calculateDistance(
      userCoords.latitude, 
      userCoords.longitude, 
      taskCoords.latitude, 
      taskCoords.longitude
    );
    
    const distanceInMeters = distanceInKm * 1000;
    console.log(t('distanceToTask', { 
      km: distanceInKm.toFixed(6), 
      meters: distanceInMeters.toFixed(2) 
    }));
    
    // Check if within radius - compare kilometers to kilometers since radius is in km
    const withinRadius = distanceInKm <= taskRadius;
    
    if (withinRadius) {
      console.log(t('withinTaskRadius', { 
        distance: distanceInMeters.toFixed(0),
        taskTitle: task.title
      }));
    } else {
      console.log(t('outsideTaskRadius', { 
        distance: distanceInMeters.toFixed(0),
        taskTitle: task.title,
        radius: taskRadius * 1000 // Convert to meters for log display
      }));
    }
    
    // Only update state if value changed to avoid rerenders
    if (isWithinRadius !== withinRadius) {
      console.log(t('updatingRadiusState', { 
        from: isWithinRadius.toString(), 
        to: withinRadius.toString() 
      }));
      setIsWithinRadius(withinRadius);
    }
    console.log(t('radiusCheckDivider'));
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return distance;
  };

  const loadTaskDetails = async () => {
    setLoading(true);
    try {
      // Try to load task details from API
      const taskDetails = await api.getTaskById(taskId);
      setTask(taskDetails);
      
      // Check if task is already started
      if (taskDetails.status === 'in-progress') {
        setTaskStarted(true);
      }
      
      // If task has a userId, fetch user details
      if (taskDetails.userId) {
        try {
          // Extract userId string if it's an object
          const userIdString = typeof taskDetails.userId === 'object' && taskDetails.userId._id 
            ? taskDetails.userId._id 
            : taskDetails.userId;
          
          console.log(`Extracted userId: ${userIdString}`);
          const user = await api.getUserById(userIdString);
          setAssignedUser(user);
        } catch (userError) {
          console.error('Error loading assigned user:', userError);
        }
      }
    } catch (error) {
      console.error('Error loading task details:', error);
      
      // Try to get task from the tasks list as fallback
      try {
        console.log('Attempting to fetch task from task list...');
        let tasksList;
        
        if (user?.isAdmin) {
          tasksList = await api.getTasks();
        } else {
          tasksList = await api.getUserTasks();
        }
        
        const foundTask = tasksList.find(t => t._id === taskId);
        if (foundTask) {
          console.log('Found task in task list:', foundTask);
          setTask(foundTask);
          
          // Check if task is already started
          if (foundTask.status === 'in-progress') {
            setTaskStarted(true);
          }
          
          // Try to get user info if we have userId
          if (foundTask.userId) {
            try {
              // Extract userId string if it's an object
              const userIdString = typeof foundTask.userId === 'object' && foundTask.userId._id 
                ? foundTask.userId._id 
                : foundTask.userId;
              
              console.log(`Extracted userId: ${userIdString}`);
              const userData = await api.getUserById(userIdString);
              setAssignedUser(userData);
            } catch (userError) {
              console.error('Error loading assigned user from fallback:', userError);
            }
          }
        } else {
          setError(t('errorLoadingTaskDetails'));
          Alert.alert(t('error'), t('taskNotFound'));
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        setError(t('errorLoadingTaskDetails'));
        Alert.alert(t('error'), t('errorLoadingTaskDetails'));
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async () => {
    if (!task) return;
    
    try {
      const updatedTask = await api.updateTask(taskId, { completed: !task.completed });
      setTask(updatedTask);
      Alert.alert(
        t('success'),
        task.completed ? t('taskMarkedIncomplete') : t('taskMarkedComplete')
      );
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert(t('error'), t('errorUpdatingTask'));
    }
  };

  const handleStartTask = async () => {
    if (!isWithinRadius) {
      Alert.alert(t('error'), t('mustBeWithinRadius'));
      return;
    }

    try {
      // Update task status to in-progress
      const updatedTask = await api.updateTask(taskId, { status: 'in-progress' });
      setTask(updatedTask);
      setTaskStarted(true);

      Alert.alert(t('success'), t('taskStarted'));
    } catch (error) {
      console.error('Error starting task:', error);
      Alert.alert(t('error'), t('errorStartingTask'));
    }
  };

  const handleEndTask = async () => {
    try {
      // Update task status to completed
      const updatedTask = await api.updateTask(taskId, { 
        status: 'completed',
        completed: true 
      });
      setTask(updatedTask);
      setTaskStarted(false);

      Alert.alert(t('success'), t('taskCompleted'));
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert(t('error'), t('errorCompletingTask'));
    }
  };

  const handleDeleteTask = async () => {
    Alert.alert(
      t('confirmDelete'),
      t('confirmDeleteTaskMessage'),
      [
        {
          text: t('cancel'),
          style: 'cancel'
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Eliminar la tarea - el backend registrará la actividad automáticamente
              await api.deleteTask(taskId);
              
              // Notificar al usuario y volver a la pantalla anterior
              Alert.alert(t('success'), t('taskDeleted'));
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert(t('error'), t('errorDeletingTask'));
            }
          }
        }
      ]
    );
  };

  // Function to stop location tracking
  const stopLocationTracking = async () => {
    console.log(t('stoppingLocationTracking'));
    if (locationSubscription) {
      locationSubscription.remove();
      console.log(t('locationTrackingStopped'));
      setLocationSubscription(null);
    }
    setIsLocationTracking(false);
  };

  // Función para enviar una actividad relacionada con la tarea
  const submitActivity = async () => {
    if (!activityInput.trim()) {
      Alert.alert(t('error'), t('pleaseEnterActivity'));
      return;
    }

    if (!taskStarted) {
      Alert.alert(t('error'), t('startTaskFirst'));
      return;
    }

    setIsSubmittingActivity(true);

    try {
      // Crear objeto de actividad
      const activityData = {
        taskId: task._id,
        message: activityInput.trim(),
        type: 'task_activity',
        timestamp: new Date().toISOString()
      };

      // Enviar al backend
      const result = await api.saveActivity(activityData);
      
      if (result && result.success) {
        // Añadir la actividad a la lista local
        const newActivity = {
          ...activityData,
          _id: result.activity._id || new Date().getTime().toString(), // Usar ID del servidor o generar uno temporal
          createdAt: result.activity.createdAt || new Date().toISOString()
        };
        
        setTaskActivities(prevActivities => [newActivity, ...prevActivities]);
        setActivityInput(''); // Limpiar el input
        
        // Mostrar mensaje de éxito
        Alert.alert(t('success'), t('activityRecorded'));
      } else {
        throw new Error(result?.message || 'Error al registrar la actividad');
      }
    } catch (error) {
      console.error('Error al enviar actividad:', error);
      Alert.alert(t('error'), t('errorSubmittingActivity'));
    } finally {
      setIsSubmittingActivity(false);
    }
  };

  // Cargar las actividades existentes para esta tarea
  const loadTaskActivities = async () => {
    try {
      const activities = await api.getTaskActivities(taskId);
      if (activities && Array.isArray(activities)) {
        setTaskActivities(activities);
      }
    } catch (error) {
      console.error('Error al cargar actividades:', error);
    }
  };

  // Cargar actividades cuando se carga la tarea
  useEffect(() => {
    if (task && task._id) {
      loadTaskActivities();
    }
  }, [task]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadTaskDetails}
        >
          <Text style={styles.retryButtonText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('taskNotFound')}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>{t('goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Check if task has location data
  const hasLocation = task.location && 
                      task.location.coordinates && 
                      task.location.coordinates.length === 2;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.taskStatusContainer}>
          <TouchableOpacity
            style={[
              styles.completeButton,
              task.completed && styles.completedButton
            ]}
            onPress={toggleComplete}
          >
            <Text style={styles.completeButtonText}>
              {task.completed ? '✓' : '○'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.taskStatus}>
            {task.completed ? t('completed') : t('pending')}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDeleteTask}
        >
          <Ionicons name="trash-outline" size={24} color="#e74c3c" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{task.title || t('noTitle')}</Text>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.label}>{t('description')}:</Text>
        <Text style={styles.description}>{task.description || t('noDescription')}</Text>
      </View>
      
      {(user?.isAdmin || task.userId === user?._id) && (
        <View style={styles.infoContainer}>
          <Text style={styles.label}>{t('assignedTo')}:</Text>
          <Text style={styles.value}>
            {assignedUser ? assignedUser.username : 
             (typeof task.userId === 'object' && task.userId.username) ? task.userId.username : 
             t('noUserAssigned')}
          </Text>
        </View>
      )}
      
      <View style={styles.infoContainer}>
        <Text style={styles.label}>{t('createdAt')}:</Text>
        <Text style={styles.value}>
          {new Date(task.createdAt).toLocaleString()}
        </Text>
      </View>
      
      {task.updatedAt && task.updatedAt !== task.createdAt && (
        <View style={styles.infoContainer}>
          <Text style={styles.label}>{t('updatedAt')}:</Text>
          <Text style={styles.value}>
            {new Date(task.updatedAt).toLocaleString()}
          </Text>
        </View>
      )}
      
      {hasLocation && (
        <View style={styles.mapContainer}>
          <Text style={styles.mapLabel}>{t('taskLocation')}:</Text>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: task.location.coordinates[1],
              longitude: task.location.coordinates[0],
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            <Marker
              coordinate={{
                latitude: task.location.coordinates[1],
                longitude: task.location.coordinates[0],
              }}
              title={task.title}
            />
            {task.radius && (
              <Circle
                center={{
                  latitude: task.location.coordinates[1],
                  longitude: task.location.coordinates[0],
                }}
                radius={task.radius * 1000} // Convert km to meters for map display
                strokeWidth={1}
                strokeColor={'#1a66ff'}
                fillColor={'rgba(30, 144, 255, 0.2)'}
              />
            )}
            {userLocation && (
              <Marker
                coordinate={{
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                }}
                title={t('yourLocation')}
                pinColor="#4CAF50"
              />
            )}
          </MapView>
          <Text style={styles.locationName}>
            {task.locationName || `${task.location.coordinates[1]}, ${task.location.coordinates[0]}`}
          </Text>
          {task.radius && (
            <Text style={styles.radius}>
              {t('radius')}: {task.radius} km
            </Text>
          )}
          {isWithinRadius ? (
            <Text style={styles.withinRadius}>{t('withinTaskRadius')}</Text>
          ) : (
            <Text style={styles.outsideRadius}>{t('outsideTaskRadius')}</Text>
          )}
        </View>
      )}
      
      {hasLocation && (
        <View style={styles.taskActionContainer}>
          {!taskStarted ? (
            <TouchableOpacity 
              style={[
                styles.startButton,
                !isWithinRadius && styles.disabledButton
              ]}
              disabled={!isWithinRadius || task.completed}
              onPress={handleStartTask}
            >
              <Ionicons name="play" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.startButtonText}>{t('startTask')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.endButton}
              onPress={handleEndTask}
            >
              <Ionicons name="stop" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.endButtonText}>{t('endTask')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{t('backToTasks')}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.activityContainer}>
        <TextInput
          style={styles.activityInput}
          value={activityInput}
          onChangeText={setActivityInput}
          placeholder={t('enterActivity')}
        />
        <TouchableOpacity 
          style={styles.submitActivityButton}
          onPress={submitActivity}
          disabled={isSubmittingActivity}
        >
          <Text style={styles.submitActivityButtonText}>{t('submitActivity')}</Text>
        </TouchableOpacity>
      </View>
      
      {taskActivities.length > 0 && (
        <View style={styles.activitiesContainer}>
          <Text style={styles.activitiesTitle}>{t('taskActivities')}</Text>
          {taskActivities.map(activity => (
            <View key={activity._id} style={styles.activityItem}>
              <Text style={styles.activityItemText}>{activity.description}</Text>
              <Text style={styles.activityItemTimestamp}>{new Date(activity.createdAt).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
      
      {taskStarted && <VoiceListener isTaskActive={taskStarted} taskData={task} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  taskStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  completedButton: {
    backgroundColor: '#4A90E2',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  taskStatus: {
    fontSize: 16,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  titleContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  infoContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  mapContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  mapLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  map: {
    height: 200,
    marginBottom: 10,
    borderRadius: 8,
  },
  locationName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  radius: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  withinRadius: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  outsideRadius: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  taskActionContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  endButton: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  endButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
  actionsContainer: {
    padding: 15,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activityContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  activityInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 16,
  },
  submitActivityButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitActivityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activitiesContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  activitiesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  activityItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  activityItemText: {
    fontSize: 16,
    color: '#333',
  },
  activityItemTimestamp: {
    fontSize: 14,
    color: '#666',
  },
});

export default TaskDetailsScreen; 