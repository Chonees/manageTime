import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SectionList,
  Button,
  Linking,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  TextInput
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

const { width, height } = Dimensions.get('window');

const AdminActivityList = () => {
  const { t } = useLanguage();
  const theme = useTheme();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pages: 1,
    total: 0
  });
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [timeFilter, setTimeFilter] = useState(null); // Filtro de tiempo (rango de horas)

  // Estado para el modal de selección de horas
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [startHour, setStartHour] = useState(7);
  const [endHour, setEndHour] = useState(8);
  const [startHourText, setStartHourText] = useState('7');
  const [endHourText, setEndHourText] = useState('8');
  const [startPeriod, setStartPeriod] = useState('AM');
  const [endPeriod, setEndPeriod] = useState('AM');

  // Horas disponibles para los selectores
  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const periods = ['AM', 'PM'];

  // Convertir hora con periodo (AM/PM) a formato 24 horas
  const convertTo24Hour = (hour, period) => {
    let hour24 = hour;
    if (period === 'PM' && hour !== 12) {
      hour24 = hour + 12;
    } else if (period === 'AM' && hour === 12) {
      hour24 = 0;
    }
    return hour24;
  };

  // Convertir hora de formato 24 horas a formato 12 horas con periodo
  const convertTo12Hour = (hour24) => {
    let hour = hour24 % 12;
    hour = hour === 0 ? 12 : hour;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return { hour, period };
  };

  // Aplicar el filtro de tiempo seleccionado
  const applyTimeFilter = () => {
    // Verificar si los campos están vacíos
    if (startHourText.trim() === '' || endHourText.trim() === '') {
      alert('Por favor ingresa valores válidos para ambas horas');
      return;
    }
    
    // Convertir los valores de texto a números
    const startHourValue = parseInt(startHourText);
    const endHourValue = parseInt(endHourText);
    
    // Validar que los valores son números válidos
    if (isNaN(startHourValue) || isNaN(endHourValue) ||
        startHourValue < 0 || startHourValue > 12 ||
        endHourValue < 0 || endHourValue > 12) {
      alert('Por favor ingresa horas válidas entre 0 y 12');
      return;
    }
    
    // Convertir 0 a 12 para formato de 12 horas
    const adjustedStartHour = startHourValue === 0 ? 12 : startHourValue;
    const adjustedEndHour = endHourValue === 0 ? 12 : endHourValue;
    
    // Convertir a formato de 24 horas
    const start = convertTo24Hour(adjustedStartHour, startPeriod);
    const end = convertTo24Hour(adjustedEndHour, endPeriod);
    
    // Validar que el rango sea válido (inicio antes que fin)
    if (start >= end) {
      alert('La hora de inicio debe ser anterior a la hora de fin');
      return;
    }
    
    // Actualizar los estados internos
    setStartHour(adjustedStartHour);
    setEndHour(adjustedEndHour);
    setTimeFilter({ start, end });
    setTimeModalVisible(false);
  };

  // Limpiar el filtro de tiempo
  const clearTimeFilter = () => {
    setTimeFilter(null);
    setStartHourText('7');
    setEndHourText('8');
    setStartHour(7);
    setEndHour(8);
    setTimeModalVisible(false);
  };

  // Formatear el rango de horas para mostrar
  const formatTimeRange = () => {
    if (!timeFilter) return 'Todas las horas';
    
    const { hour: startHour12, period: startPeriod12 } = convertTo12Hour(timeFilter.start);
    const { hour: endHour12, period: endPeriod12 } = convertTo12Hour(timeFilter.end);
    
    return `${startHour12} ${startPeriod12} - ${endHour12} ${endPeriod12}`;
  };

  // Cargar las actividades
  const loadActivities = async (page = 1) => {
    try {
      setLoading(true);
      
      // Obtener el token de autenticación
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación disponible');
      }
      
      // Usar el endpoint CORRECTO para administradores
      const url = `${api.getApiUrl()}/api/activities/admin/all?page=${page}&limit=100`;
      console.log(`Obteniendo actividades de administrador desde: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error en respuesta de actividades:', errorData);
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Datos de actividades recibidos:', data);
      
      // Extraer las actividades del resultado
      const activitiesFromApi = data.activities || [];
      
      if (page === 1) {
        setActivities(activitiesFromApi);
      } else {
        setActivities(prevActivities => [...prevActivities, ...activitiesFromApi]);
      }
      
      // Usar la paginación del servidor si está disponible
      setPagination(data.pagination || {
        currentPage: page,
        pages: Math.ceil((data.total || 0) / 100),
        total: data.total || 0
      });
      
      console.log(`Actividades cargadas: ${activitiesFromApi.length}`);
      
      if (activitiesFromApi.length === 0 && page === 1) {
        setError('No hay actividades disponibles para mostrar');
      } else {
        setError(null);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
      setError(error.message || t('error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Cargar actividades al iniciar
  useEffect(() => {
    loadActivities();
  }, []);

  // Función para refrescar
  const onRefresh = () => {
    setRefreshing(true);
    loadActivities(1);
  };

  // Cargar más actividades (paginación)
  const loadMore = () => {
    if (pagination.currentPage < pagination.pages && !loading) {
      loadActivities(pagination.currentPage + 1);
    }
  };

  // Formatear fecha y hora
  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date time:', error);
      return dateString || 'Fecha desconocida';
    }
  };

  // Formatear solo la fecha
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || 'Fecha desconocida';
    }
  };

  // Formatear solo la hora
  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  // Formatear tiempo relativo
  const formatRelativeTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      // Si la fecha es de hoy, mostrar "Hoy a las HH:MM"
      if (date.toDateString() === now.toDateString()) {
        return `Hoy a las ${formatTime(dateString)}`;
      }
      
      // Si no, usar format-distance-to-now
      return formatDistanceToNow(date, { 
        addSuffix: true,
        locale: t('locale') === 'es' ? es : enUS
      });
    } catch (error) {
      console.error('Error formatting relative time:', error);
      return dateString || 'Fecha desconocida';
    }
  };

  // Obtener el icono según el tipo de actividad
  const getActivityIcon = (type) => {
    switch (type) {
      case 'location_enter':
        return 'enter-outline';
      case 'location_exit':
        return 'exit-outline';
      case 'location_check':
        return 'location-outline';
      case 'task_complete':
        return 'checkmark-circle-outline';
      case 'task_create':
        return 'add-circle-outline';

        return 'create-outline';
      case 'task_delete':
        return 'trash-outline';
      default:
        return 'information-circle-outline';
    }
  };

  // Obtener el color según el tipo de actividad
  const getActivityColor = (type) => {
    switch (type) {
      case 'location_enter':
        return '#2196F3'; // Azul
      case 'location_exit':
        return '#673AB7'; // Morado
      case 'location_check':
        return '#03A9F4'; // Azul claro
      case 'task_complete':
        return '#4CAF50'; // Verde
      case 'task_create':
        return '#009688'; // Verde azulado

        return '#FF9800'; // Naranja
      case 'task_delete':
        return '#ff5252'; // Rojo
      default:
        return '#607d8b'; // Gris azulado
    }
  };

  // Obtener texto descriptivo según el tipo de actividad
  const getActivityTypeText = (type) => {
    switch (type) {
      case 'task_create':
        return 'Creación de tarea';

        return 'Actualización de tarea';
      case 'task_complete':
        return 'Tarea completada';
      case 'task_delete':
        return 'Tarea eliminada';
      case 'location_enter':
        return 'Entrada a ubicación';
      case 'location_exit':
        return 'Salida de ubicación';
      case 'location_check':
        return 'Punto de seguimiento';
      default:
        return 'Actividad';
    }
  };

  // Generar una descripción detallada de la actividad
  const getDetailedDescription = (activity) => {
    const { type, metadata, message } = activity;
    
    if (message && message.trim()) {
      return message;
    }
    
    switch (type) {
      case 'task_create':
        return 'Creó una tarea';
        

        return 'Actualizó una tarea';
        
      case 'task_complete':
        return 'Completó una tarea';
        
      case 'task_delete':
        return 'Eliminó una tarea';
        
      case 'location_enter':
        if (metadata && metadata.locationName) {
          return `Entró a ${metadata.locationName}`;
        }
        return 'Entró a una ubicación';
        
      case 'location_exit':
        if (metadata && metadata.locationName) {
          return `Salió de ${metadata.locationName}`;
        }
        return 'Salió de una ubicación';
        
      case 'location_check':
        if (metadata && metadata.locationName) {
          return `Registró posición en ${metadata.locationName}`;
        }
        return 'Punto de seguimiento';
                
      default:
        return message || 'Actividad sin detalle';
    }
  };

  // Filtrar actividades por tipo
  const getFilteredActivities = () => {
    let filteredActivities = activities;
    
    if (filterType === 'all') {
      // Excluir actividades de verificación de ubicación y puntos de seguimiento
      filteredActivities = activities.filter(activity => activity.type !== 'location_check');
    } else if (filterType && filterType !== 'all') {
      filteredActivities = activities.filter(activity => {
        const { type } = activity;
        
        if (filterType === 'availability') {
          // Ya no hay actividades de disponibilidad
          return false;
        }
        
        if (filterType === 'task') {
          return type.includes('task_');
        }
        
        if (filterType === 'location') {
          return type.includes('location_');
        }
        
        return type === filterType;
      });
    }
    
    return filteredActivities;
  };

  // Agrupar actividades por usuario
  const getGroupedActivities = () => {
    const filtered = getFilteredActivities();
    const grouped = {};
    
    filtered.forEach((activity) => {
      let userKey = 'unknown';
      let userName = 'Usuario desconocido';
      
      if (typeof activity.userId === 'object' && activity.userId?.username) {
        userKey = activity.userId._id || 'unknown';
        userName = activity.userId.username;
      } else if (typeof activity.userId === 'string') {
        userKey = activity.userId;
        userName = `Usuario ID: ${activity.userId.substring(0, 8)}...`;
      }
      
      if (!grouped[userKey]) {
        grouped[userKey] = {
          title: userName,
          data: [],
        };
      }
      
      grouped[userKey].data.push(activity);
    });
    
    // Convertir el objeto en un array para SectionList
    return Object.values(grouped).sort((a, b) => {
      // Ordenar secciones por nombre de usuario
      return a.title.localeCompare(b.title);
    });
  };

  // Renderizar el modal con mapa
  const renderMapModal = () => {
    if (!selectedCoordinates) return null;
    
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={mapModalVisible}
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ubicación</Text>
              <TouchableOpacity onPress={() => setMapModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff3e5" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>{selectedCoordinates.description}</Text>
            <Text style={styles.modalCoordinates}>
              {selectedCoordinates.latitude.toFixed(6)}, {selectedCoordinates.longitude.toFixed(6)}
            </Text>
            <Text style={styles.modalDateTime}>{formatDateTime(selectedCoordinates.timestamp)}</Text>
            
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: selectedCoordinates.latitude,
                longitude: selectedCoordinates.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              <Marker
                coordinate={{
                  latitude: selectedCoordinates.latitude,
                  longitude: selectedCoordinates.longitude
                }}
                title={selectedCoordinates.description}
              />
            </MapView>
            
            <TouchableOpacity 
              style={styles.openMapsButton}
              onPress={() => {
                // URL para Apple Maps en iOS
                const url = `http://maps.apple.com/?q=${selectedCoordinates.latitude},${selectedCoordinates.longitude}`;
                Linking.openURL(url);
              }}
            >
              <Text style={styles.openMapsButtonText}>Abrir en Maps</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Renderizar un elemento de actividad
  const renderActivityItem = ({ item }) => {
    const { type, createdAt, userId, taskId, metadata, message } = item;
    
    // Obtener nombre de usuario (puede venir de diferentes formas)
    let userName = 'Usuario desconocido';
    if (typeof userId === 'object' && userId?.username) {
      userName = userId.username;
    } else if (typeof userId === 'string') {
      userName = `Usuario ID: ${userId.substring(0, 8)}...`;
    }
    
    // Obtener información de tipo y estilo
    const typeText = getActivityTypeText(type);
    const color = getActivityColor(type);
    const icon = getActivityIcon(type);
    
    // Utilizar el mensaje directamente si existe
    const detailedDescription = message || getDetailedDescription(item);

    // Función para abrir el modal con mapa para location_check
    const handleOpenMap = () => {
      if (metadata && metadata.latitude && metadata.longitude) {
        setSelectedCoordinates({
          latitude: metadata.latitude,
          longitude: metadata.longitude,
          description: detailedDescription,
          timestamp: createdAt || item.timestamp
        });
        setMapModalVisible(true);
      }
    };

    return (
      <View style={styles.activityItem}>
        <View style={[styles.activityIconContainer, { backgroundColor: color }]}>
          <Ionicons 
            name={icon} 
            size={24} 
            color="white" 
            style={styles.iconCentered} 
          />
        </View>
        
        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityType}>{typeText}</Text>
            <Text style={styles.activityTime}>{formatTime(createdAt || item.timestamp)}</Text>
          </View>
          
          {viewMode === 'list' && (
            <Text style={styles.userName}>{userName}</Text>
          )}
          
          <Text style={styles.activityDescription}>{detailedDescription}</Text>
          
          <Text style={styles.activityDateTime}>{formatDate(createdAt || item.timestamp)}</Text>
          
          {metadata && metadata.duration && (
            <Text style={styles.activityDuration}>
              Duración: {Math.floor(metadata.duration / 60)} minutos
            </Text>
          )}
          
          {/* Botón para ver ubicación en mapa si es una actividad de tipo location_check */}
          {type === 'location_check' && metadata && metadata.latitude && metadata.longitude && (
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={handleOpenMap}
            >
              <Ionicons name="map-outline" size={16} color={theme.colors.lightCream} />
              <Text style={styles.mapButtonText}>Ver en mapa</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };
  
  // Renderizar el encabezado de sección para la vista agrupada
  const renderSectionHeader = ({ section: { title } }) => {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
      </View>
    );
  };
  
  // Renderizar el separador entre elementos
  const renderSeparator = () => <View style={styles.separator} />;
  
  // Renderizar el modal para selección de horas - versión simplificada
  const renderTimeFilterModal = () => {
    return (
      <Modal
        visible={timeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTimeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectTimeRange')}</Text>
              <TouchableOpacity onPress={() => setTimeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff3e5" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.simpleTimeContainer}>
              {/* Desde */}
              <View style={styles.simpleTimeInputGroup}>
                <Text style={styles.simpleTimeLabel}>{t('from')}</Text>
                <View style={styles.timeInputContainer}>
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={startHourText}
                    onChangeText={setStartHourText}
                  />
                  <View style={styles.periodSwitchContainer}>
                    <TouchableOpacity
                      style={[
                        styles.periodSwitchButton,
                        startPeriod === 'AM' && styles.periodSwitchButtonActive
                      ]}
                      onPress={() => setStartPeriod('AM')}
                    >
                      <Text style={[
                        styles.periodSwitchText,
                        startPeriod === 'AM' && styles.periodSwitchTextActive
                      ]}>AM</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.periodSwitchButton,
                        startPeriod === 'PM' && styles.periodSwitchButtonActive
                      ]}
                      onPress={() => setStartPeriod('PM')}
                    >
                      <Text style={[
                        styles.periodSwitchText,
                        startPeriod === 'PM' && styles.periodSwitchTextActive
                      ]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              
              {/* Hasta */}
              <View style={styles.simpleTimeInputGroup}>
                <Text style={styles.simpleTimeLabel}>{t('to')}</Text>
                <View style={styles.timeInputContainer}>
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={endHourText}
                    onChangeText={setEndHourText}
                  />
                  <View style={styles.periodSwitchContainer}>
                    <TouchableOpacity
                      style={[
                        styles.periodSwitchButton,
                        endPeriod === 'AM' && styles.periodSwitchButtonActive
                      ]}
                      onPress={() => setEndPeriod('AM')}
                    >
                      <Text style={[
                        styles.periodSwitchText,
                        endPeriod === 'AM' && styles.periodSwitchTextActive
                      ]}>AM</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.periodSwitchButton,
                        endPeriod === 'PM' && styles.periodSwitchButtonActive
                      ]}
                      onPress={() => setEndPeriod('PM')}
                    >
                      <Text style={[
                        styles.periodSwitchText,
                        endPeriod === 'PM' && styles.periodSwitchTextActive
                      ]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={clearTimeFilter}
              >
                <Text style={styles.modalCancelButtonText}>{t('clear')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalApplyButton} 
                onPress={applyTimeFilter}
              >
                <Text style={styles.modalApplyButtonText}>{t('apply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Renderizar los botones de filtro
  const renderFilterButtons = () => {
    return (
      <View>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive, { marginTop: 6 }]}
            onPress={() => {
              setFilterType('all');
              setTimeFilter(null); // Limpiar filtro de hora al cambiar de tipo
            }}
          >
            <Ionicons
              name="list-outline"
              size={Math.min(width * 0.05, 18)}
              color={filterType === 'all' ? '#2e2e2e' : '#fff3e5'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterType === 'all' && styles.filterButtonTextActive
              ]}
            >
              {t('allActivities')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'location' && styles.filterButtonActive]}
            onPress={() => {
              setFilterType('location');
              // No limpiar el filtro de hora si ya está establecido
            }}
          >
            <Ionicons
              name="location-outline"
              size={Math.min(width * 0.05, 18)}
              color={filterType === 'location' ? '#2e2e2e' : '#fff3e5'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterType === 'location' && styles.filterButtonTextActive
              ]}
            >
              {t('locations')}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Mostrar botón de filtro de tiempo solo cuando se selecciona el filtro de ubicación */}
        {filterType === 'location' && (
          <View style={styles.timeFilterContainer}>
            <TouchableOpacity 
              style={styles.timeFilterMainButton}
              onPress={() => setTimeModalVisible(true)}
            >
              <Ionicons 
                name="time-outline" 
                size={Math.min(width * 0.05, 18)} 
                color="#fff3e5" 
                style={{ marginRight: 6 }} 
              />
              <Text style={styles.timeFilterMainButtonText}>
                {t('timeFilter')}
              </Text>
              <Ionicons 
                name="chevron-down-outline" 
                size={Math.min(width * 0.04, 16)} 
                color="#fff3e5" 
                style={{ marginLeft: 6 }} 
              />
            </TouchableOpacity>
            
            {timeFilter && (
              <TouchableOpacity 
                style={styles.timeFilterClearButton}
                onPress={() => setTimeFilter(null)}
              >
                <Ionicons 
                  name="close-circle-outline" 
                  size={Math.min(width * 0.05, 18)} 
                  color="#fff3e5" 
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };
  
  // Renderizar los botones de modo de vista
  const renderViewModeButtons = () => {
    return (
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons
            name="list-outline"
            size={16}
            color={viewMode === 'list' ? '#2e2e2e' : '#fff3e5'}
          />
          <Text
            style={[
              styles.viewModeButtonText,
              viewMode === 'list' && styles.viewModeButtonTextActive,
            ]}
          >
            {t('list')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'grouped' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('grouped')}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color={viewMode === 'grouped' ? '#2e2e2e' : '#fff3e5'}
          />
          <Text
            style={[
              styles.viewModeButtonText,
              viewMode === 'grouped' && styles.viewModeButtonTextActive,
            ]}
          >
            {t('byUser')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Renderizar el encabezado de la pantalla
  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <Text style={styles.title}>{t('adminActivities')}</Text>
        <Text style={styles.subtitle}>{t('adminActivitiesSubtitle')}</Text>
        
        {renderFilterButtons()}
        {renderViewModeButtons()}
        
        {loading && <ActivityIndicator size="large" color={theme.colors.lightCream} style={styles.loader} />}
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Renderizado principal del componente
  return (
    <>
      {viewMode === 'list' ? (
        <FlatList
          data={getFilteredActivities()}
          keyExtractor={(item) => item._id}
          renderItem={renderActivityItem}
          ItemSeparatorComponent={renderSeparator}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff3e5" />
                <Text style={styles.loadingText}>{t('loading')}</Text>
              </View>
            ) : (
              <Text style={styles.emptyText}>
                {t('noActivities')}
              </Text>
            )
          }
          ListFooterComponent={
            pagination.currentPage < pagination.pages && !loading ? (
              <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
                <Text style={styles.loadMoreButtonText}>{t('loadMore')}</Text>
              </TouchableOpacity>
            ) : pagination.currentPage > 1 && loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff3e5" />
                <Text style={styles.loadingText}>{t('loading')}</Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContentContainer}
        />
      ) : (
        <SectionList
          sections={getGroupedActivities()}
          keyExtractor={(item) => item._id}
          renderItem={renderActivityItem}
          renderSectionHeader={renderSectionHeader}
          ItemSeparatorComponent={renderSeparator}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff3e5" />
                <Text style={styles.loadingText}>{t('loading')}</Text>
              </View>
            ) : (
              <Text style={styles.emptyText}>
                {t('noActivities')}
              </Text>
            )
          }
          ListFooterComponent={
            pagination.currentPage < pagination.pages && !loading ? (
              <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
                <Text style={styles.loadMoreButtonText}>{t('loadMore')}</Text>
              </TouchableOpacity>
            ) : pagination.currentPage > 1 && loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff3e5" />
                <Text style={styles.loadingText}>{t('loading')}</Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContentContainer}
        />
      )}
      {renderMapModal()}
      {renderTimeFilterModal()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e',
    padding: 16,
  },
  // Estilos para el botón del mapa
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  mapButtonText: {
    color: '#fff3e5',
    fontSize: Math.min(width * 0.03, 12),
    marginLeft: 4,
    fontWeight: '500',
  },
  // Estilos para el modal del mapa
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxHeight: height * 0.8,
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: Math.min(width * 0.05, 18),
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  modalDescription: {
    fontSize: Math.min(width * 0.04, 16),
    color: '#ffffff',
    marginBottom: 8,
  },
  modalCoordinates: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#1976d2',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalDateTime: {
    fontSize: Math.min(width * 0.03, 12),
    color: '#ffffff',
    opacity: 0.6,
    marginBottom: 15,
  },
  map: {
    width: '100%',
    height: 250,
    borderRadius: 10,
    marginBottom: 15,
  },
  openMapsButton: {
    backgroundColor: '#1976d2',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  openMapsButtonText: {
    color: '#fff3e5',
    fontWeight: 'bold',
    fontSize: Math.min(width * 0.04, 16),
  },
  header: {
    marginTop: 15,
    marginBottom: 16,
  },
  title: {
    fontSize: Math.min(width * 0.06, 24),
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#ffffff',
    opacity: 0.7,
  },
  // Estilos para los filtros
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: '#1c1c1c',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  filterButtonActive: {
    backgroundColor: '#fff3e5',
    borderColor: '#fff3e5',
  },
  filterButtonText: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#fff3e5',
    marginLeft: 4,
  },
  filterButtonTextActive: {
    color: '#2e2e2e',
  },
  // Estilos para el filtro de tiempo
  timeFilterContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeFilterMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
    flex: 1,
  },
  timeFilterMainButtonText: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#fff3e5',
    flex: 1,
  },
  timeFilterClearButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: 'rgba(255, 243, 229, 0.1)',
    borderRadius: 20,
  },
  // Estilos para el modal de selección de tiempo (versión simplificada)
  timeModalContent: {
    width: '85%',
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    alignItems: 'center',
  },
  simpleTimeContainer: {
    marginVertical: 20,
    width: '100%',
    alignItems: 'center',
  },
  simpleTimeInputGroup: {
    marginBottom: 16,
    width: '90%',
    alignItems: 'center',
  },
  simpleTimeLabel: {
    fontSize: Math.min(width * 0.04, 16),
    color: '#fff3e5',
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 10,
    width: 60,
    color: '#fff3e5',
    fontSize: Math.min(width * 0.05, 18),
    textAlign: 'center',
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  periodSwitchContainer: {
    flexDirection: 'row',
    marginLeft: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  periodSwitchButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodSwitchButtonActive: {
    backgroundColor: '#fff3e5',
  },
  periodSwitchText: {
    color: '#fff3e5',
    fontSize: Math.min(width * 0.04, 14),
  },
  periodSwitchTextActive: {
    fontWeight: 'bold',
    color: '#1c1c1c',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#1c1c1c',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  modalCancelButtonText: {
    color: '#fff3e5',
    fontSize: Math.min(width * 0.04, 16),
  },
  modalApplyButton: {
    flex: 1,
    backgroundColor: '#fff3e5',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#000000',
  },
  modalApplyButtonText: {
    color: '#1c1c1c',
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: 'bold',
  },
  // Estilos para los modos de vista
  viewModeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: '#1c1c1c',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  viewModeButtonActive: {
    backgroundColor: '#fff3e5',
    borderColor: '#fff3e5',
  },
  viewModeButtonText: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#fff3e5',
    marginLeft: 4,
  },
  viewModeButtonTextActive: {
    color: '#2e2e2e',
  },
  // Estilos para las secciones (agrupación por usuario)
  sectionHeader: {
    backgroundColor: '#1c1c1c',
    padding: 12,
    borderRadius: 15,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  sectionHeaderText: {
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  // Estilos para los elementos de actividad
  activityItem: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    padding: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexDirection: 'row',
  },
  iconCentered: {
    alignSelf: 'center',
    textAlign: 'center',
  },
  updateIconFix: {
    position: 'relative',
    left: 2,  // Ajuste horizontal específico para el icono create-outline
    top: 0, // Ligero ajuste vertical
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityType: {
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  activityTime: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#ffffff',
    opacity: 0.7,
  },
  userName: {
    fontSize: Math.min(width * 0.035, 14),
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#ffffff',
    opacity: 0.9,
    marginVertical: 4,
  },
  activityDateTime: {
    fontSize: Math.min(width * 0.03, 12),
    color: '#ffffff',
    opacity: 0.6,
    marginTop: 4,
  },
  activityDuration: {
    fontSize: Math.min(width * 0.03, 12),
    color: '#fff3e5',
    marginTop: 4,
  },
  separator: {
    height: 8,
  },
  // Estilos para estados de carga y error
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: Math.min(width * 0.035, 14),
    color: '#ffffff',
    opacity: 0.7,
  },
  emptyText: {
    padding: 24,
    fontSize: Math.min(width * 0.04, 16),
    color: '#ffffff',
    opacity: 0.7,
    textAlign: 'center',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: 'rgba(211, 47, 47, 0.2)',
    borderRadius: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.3)',
  },
  errorText: {
    fontSize: Math.min(width * 0.035, 14),
    color: '#ff5252',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#1c1c1c',
    padding: 10,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  retryButtonText: {
    color: '#fff3e5',
    fontSize: Math.min(width * 0.035, 14),
    fontWeight: 'bold',
  },
  loadMoreButton: {
    backgroundColor: '#1c1c1c',
    padding: 12,
    borderRadius: 15,
    alignItems: 'center',
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.2)',
  },
  loadMoreButtonText: {
    color: '#fff3e5',
    fontSize: Math.min(width * 0.035, 14),
    fontWeight: 'bold',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: Math.min(width * 0.035, 14),
    color: '#ffffff',
    opacity: 0.7,
  },
  listContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loader: {
    marginVertical: 10,
  },
});

export default AdminActivityList;
