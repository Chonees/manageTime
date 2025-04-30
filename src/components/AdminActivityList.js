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
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getAdminActivities } from '../services/api';
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

  // Cargar las actividades
  const loadActivities = async (page = 1) => {
    try {
      setLoading(true);
      const response = await getAdminActivities({ 
        page, 
        limit: 100,
        sort: '-createdAt'
      });
      
      if (page === 1) {
        setActivities(response.activities || []);
      } else {
        setActivities(prevActivities => [...prevActivities, ...(response.activities || [])]);
      }
      
      setPagination(response.pagination || {
        currentPage: 1,
        pages: 1,
        total: 0
      });
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
      return t('unknownDate');
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
      return t('unknownDate');
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
      return '';
    }
  };

  // Formatear tiempo relativo
  const formatRelativeTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        return `${days} ${t('daysAgo')}`;
      } else if (hours > 0) {
        return `${hours} ${t('hoursAgo')}`;
      } else if (minutes > 0) {
        return `${minutes} ${t('minutesAgo')}`;
      } else {
        return `${seconds} ${t('secondsAgo')}`;
      }
    } catch (error) {
      return t('someTimeAgo');
    }
  };

  // Obtener el icono según el tipo de actividad
  const getActivityIcon = (type) => {
    switch (type) {
      case 'location_enter':
        return 'enter-outline';
      case 'location_exit':
        return 'exit-outline';
      case 'task_complete':
        return 'checkmark-circle-outline';
      case 'task_create':
        return 'add-circle-outline';
      case 'task_update':
        return 'create-outline';
      case 'task_delete':
        return 'trash-outline';
      case 'started_working':
      case 'clock_in':
        return 'play-circle-outline';
      case 'stopped_working':
      case 'clock_out':
        return 'stop-circle-outline';
      default:
        return 'information-circle-outline';
    }
  };

  // Obtener color según el tipo de actividad
  const getActivityColor = (type) => {
    switch (type) {
      case 'location_enter':
        return '#4caf50'; // Verde
      case 'location_exit':
        return '#f44336'; // Rojo
      case 'task_complete':
        return '#2196f3'; // Azul
      case 'task_create':
        return '#9c27b0'; // Púrpura
      case 'task_update':
        return '#ff9800'; // Naranja
      case 'task_delete':
        return '#795548'; // Marrón
      case 'started_working':
      case 'clock_in':
        return '#4CAF50'; // Verde
      case 'stopped_working':
      case 'clock_out':
        return '#FF5722'; // Naranja rojizo
      default:
        return '#607d8b'; // Gris azulado
    }
  };

  // Obtener texto descriptivo según el tipo de actividad
  const getActivityTypeText = (type) => {
    switch (type) {
      case 'location_enter':
        return 'Entrada a ubicación';
      case 'location_exit':
        return 'Salida de ubicación';
      case 'task_complete':
        return 'Tarea completada';
      case 'task_create':
        return 'Tarea creada';
      case 'task_update':
        return 'Tarea actualizada';
      case 'task_delete':
        return 'Tarea eliminada';
      case 'started_working':
      case 'clock_in':
        return 'Disponible';
      case 'stopped_working':
      case 'clock_out':
        return 'No disponible';
      default:
        return 'Actividad';
    }
  };

  // Generar una descripción detallada de la actividad
  const getDetailedDescription = (item) => {
    const { type, message, metadata, taskId } = item;
    
    // Si hay un mensaje específico, usarlo
    if (message && message !== 'Actividad sin descripción') {
      return message;
    }
    
    switch (type) {
      case 'location_enter':
        return metadata && metadata.latitude && metadata.longitude 
          ? `Entrada registrada en coordenadas: ${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`
          : 'Entrada a ubicación registrada';
          
      case 'location_exit':
        return metadata && metadata.latitude && metadata.longitude 
          ? `Salida registrada en coordenadas: ${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`
          : 'Salida de ubicación registrada';
          
      case 'task_complete':
        return taskId ? `Completó la tarea: "${taskId.title || 'Sin título'}"` : 'Completó una tarea';
        
      case 'task_create':
        return taskId ? `Creó la tarea: "${taskId.title || 'Sin título'}"` : 'Creó una nueva tarea';
        
      case 'task_update':
        return taskId ? `Actualizó la tarea: "${taskId.title || 'Sin título'}"` : 'Actualizó una tarea';
        
      case 'task_delete':
        return 'Eliminó una tarea';
        
      case 'started_working':
      case 'clock_in':
        if (metadata && metadata.duration) {
          return `Marcó como disponible (duración: ${Math.floor(metadata.duration / 60)} min)`;
        } else if (metadata && metadata.latitude && metadata.longitude) {
          return `Marcó como disponible en coordenadas: ${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`;
        }
        return 'Marcó como disponible';
        
      case 'stopped_working':
      case 'clock_out':
        if (metadata && metadata.duration) {
          return `Marcó como no disponible (duración: ${Math.floor(metadata.duration / 60)} min)`;
        } else if (metadata && metadata.latitude && metadata.longitude) {
          return `Marcó como no disponible en coordenadas: ${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`;
        }
        return 'Marcó como no disponible';
        
      default:
        return 'Actividad registrada';
    }
  };

  // Filtrar actividades por tipo
  const getFilteredActivities = () => {
    if (filterType === 'all') {
      return activities;
    }
    
    return activities.filter(activity => {
      const { type } = activity;
      
      if (filterType === 'availability') {
        return ['clock_in', 'clock_out', 'started_working', 'stopped_working'].includes(type);
      }
      
      if (filterType === 'tasks') {
        return ['task_create', 'task_update', 'task_complete', 'task_delete'].includes(type);
      }
      
      if (filterType === 'locations') {
        return ['location_enter', 'location_exit'].includes(type);
      }
      
      return true;
    });
  };

  // Agrupar actividades por usuario
  const getGroupedActivities = () => {
    const filteredActivities = getFilteredActivities();
    const groupedByUser = {};
    
    // Agrupar por usuario
    filteredActivities.forEach(activity => {
      const userName = activity.userId?.username || 'Usuario desconocido';
      if (!groupedByUser[userName]) {
        groupedByUser[userName] = [];
      }
      groupedByUser[userName].push(activity);
    });
    
    // Convertir a formato para SectionList
    return Object.keys(groupedByUser).map(userName => ({
      title: userName,
      data: groupedByUser[userName]
    }));
  };

  // Renderizar un elemento de actividad
  const renderActivityItem = ({ item }) => {
    const { type, createdAt, userId, taskId, metadata } = item;
    const userName = userId?.username || 'Usuario desconocido';
    const typeText = getActivityTypeText(type);
    const color = getActivityColor(type);
    const icon = getActivityIcon(type);
    const detailedDescription = getDetailedDescription(item);

    return (
      <View style={styles.activityItem}>
        <View style={[styles.activityIconContainer, { backgroundColor: color }]}>
          <Ionicons name={icon} size={24} color="white" />
        </View>
        
        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityType}>{typeText}</Text>
            <Text style={styles.activityTime}>{formatTime(createdAt)}</Text>
          </View>
          
          {viewMode === 'list' && (
            <Text style={styles.userName}>{userName}</Text>
          )}
          
          <Text style={styles.activityDescription}>{detailedDescription}</Text>
          
          <Text style={styles.activityDateTime}>{formatDate(createdAt)}</Text>
          
          {metadata && metadata.duration && (
            <Text style={styles.activityDuration}>
              Duración: {Math.floor(metadata.duration / 60)} minutos
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Renderizar el encabezado de sección para la vista agrupada
  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  // Renderizar el separador entre elementos
  const renderSeparator = () => <View style={styles.separator} />;

  // Renderizar los botones de filtro
  const renderFilterButtons = () => {
    return (
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
          onPress={() => setFilterType('all')}
        >
          <Ionicons name="list-outline" size={16} color={filterType === 'all' ? theme.colors.darkGrey : theme.colors.lightCream} />
          <Text style={[styles.filterButtonText, filterType === 'all' && styles.filterButtonTextActive]}>{t('all')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'availability' && styles.filterButtonActive]}
          onPress={() => setFilterType('availability')}
        >
          <Ionicons name="person-outline" size={16} color={filterType === 'availability' ? theme.colors.darkGrey : theme.colors.lightCream} />
          <Text style={[styles.filterButtonText, filterType === 'availability' && styles.filterButtonTextActive]}>{t('availability')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'location' && styles.filterButtonActive]}
          onPress={() => setFilterType('location')}
        >
          <Ionicons name="location-outline" size={16} color={filterType === 'location' ? theme.colors.darkGrey : theme.colors.lightCream} />
          <Text style={[styles.filterButtonText, filterType === 'location' && styles.filterButtonTextActive]}>{t('location')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'task' && styles.filterButtonActive]}
          onPress={() => setFilterType('task')}
        >
          <Ionicons name="checkbox-outline" size={16} color={filterType === 'task' ? theme.colors.darkGrey : theme.colors.lightCream} />
          <Text style={[styles.filterButtonText, filterType === 'task' && styles.filterButtonTextActive]}>{t('tasks')}</Text>
        </TouchableOpacity>
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
          <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? theme.colors.darkGrey : theme.colors.lightCream} />
          <Text style={[styles.viewModeButtonText, viewMode === 'list' && styles.viewModeButtonTextActive]}>{t('list')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'byUser' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('byUser')}
        >
          <Ionicons name="people-outline" size={16} color={viewMode === 'byUser' ? theme.colors.darkGrey : theme.colors.lightCream} />
          <Text style={[styles.viewModeButtonText, viewMode === 'byUser' && styles.viewModeButtonTextActive]}>{t('byUser')}</Text>
        </TouchableOpacity>
      </View>
    );
  };
  // Renderizar el componente principal
  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{t('userActivities')}</Text>
        {pagination.total > 0 && (
          <Text style={styles.subtitle}>
            {t('showingActivities', { count: activities.length, total: pagination.total })}
          </Text>
        )}
      </View>

      {renderViewModeButtons()}
      {renderFilterButtons()}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadActivities(1)}>
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  if (viewMode === 'list') {
    return (
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
              <ActivityIndicator size="large" color="#4A90E2" />
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
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#4A90E2" />
              <Text style={styles.loadingMoreText}>{t('loadingMore')}</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContentContainer}
      />
    );
  } else {
    return (
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
              <ActivityIndicator size="large" color="#4A90E2" />
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
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#4A90E2" />
              <Text style={styles.loadingMoreText}>{t('loadingMore')}</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContentContainer}
      />
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e',
    padding: 16,
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
  // Estilos para la leyenda
  legendContainer: {
    marginTop: 16,
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.1)',
  },
  legendTitle: {
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
    width: '45%',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: Math.min(width * 0.03, 12),
    color: '#ffffff',
    opacity: 0.7,
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
});

export default AdminActivityList;
