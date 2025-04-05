import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  FlatList,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAdminActivities } from '../services/api';

const AdminActivityList = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [error, setError] = useState(null);

  // Cargar las actividades
  const loadActivities = async (page = 1) => {
    try {
      setLoading(true);
      const response = await getAdminActivities({ 
        page, 
        limit: pagination.limit 
      });
      
      setActivities(response.activities || []);
      setPagination(response.pagination || {
        currentPage: 1,
        limit: 20,
        total: 0,
        pages: 0
      });
    } catch (error) {
      console.error('Error al cargar actividades:', error);
      setError(error.message || 'Error al cargar actividades');
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
      return date.toLocaleString('es-AR', { 
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha desconocida';
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
        return `${days} día${days > 1 ? 's' : ''} atrás`;
      } else if (hours > 0) {
        return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
      } else if (minutes > 0) {
        return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
      } else {
        return `${seconds} segundo${seconds !== 1 ? 's' : ''} atrás`;
      }
    } catch (error) {
      return 'hace un tiempo';
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
      default:
        return '#607d8b'; // Gris azulado
    }
  };

  // Obtener texto descriptivo según el tipo de actividad
  const getActivityTypeText = (type) => {
    switch (type) {
      case 'location_enter':
        return 'Entró en zona';
      case 'location_exit':
        return 'Salió de zona';
      case 'task_complete':
        return 'Completó tarea';
      case 'task_create':
        return 'Creó tarea';
      case 'task_update':
        return 'Actualizó tarea';
      case 'task_delete':
        return 'Eliminó tarea';
      default:
        return 'Actividad';
    }
  };

  // Renderizar un elemento de actividad
  const renderActivityItem = ({ item }) => {
    const { type, message, createdAt, userId, taskId, metadata } = item;
    const userName = userId?.username || 'Usuario desconocido';
    const taskName = taskId?.title || 'Tarea sin nombre';
    const taskDescription = taskId?.description || '';
    const typeText = getActivityTypeText(type);
    const color = getActivityColor(type);
    const icon = getActivityIcon(type);

    return (
      <View style={styles.activityItem}>
        <View style={[styles.activityIconContainer, { backgroundColor: color }]}>
          <Ionicons name={icon} size={24} color="white" />
        </View>
        
        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityType}>{typeText}</Text>
            <Text style={styles.activityTime}>{formatRelativeTime(createdAt)}</Text>
          </View>
          
          <Text style={styles.userName}>{userName}</Text>
          
          {taskId && (
            <View style={styles.taskInfo}>
              <Text style={styles.taskName}>{taskName}</Text>
              {taskDescription !== '' && (
                <Text style={styles.taskDescription} numberOfLines={2}>
                  {taskDescription}
                </Text>
              )}
            </View>
          )}
          
          <Text style={styles.activityMessage}>{message}</Text>
          
          <Text style={styles.activityDateTime}>{formatDateTime(createdAt)}</Text>
          
          {metadata && Object.keys(metadata).length > 0 && (
            <View style={styles.metadataContainer}>
              {Object.entries(metadata).map(([key, value]) => (
                <Text key={key} style={styles.metadataItem}>
                  {key}: {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Renderizar el separador entre elementos
  const renderSeparator = () => <View style={styles.separator} />;

  // Renderizar el componente principal
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Actividades de Usuarios</Text>
        {pagination.total > 0 && (
          <Text style={styles.subtitle}>
            Mostrando {activities.length} de {pagination.total} actividades
          </Text>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadActivities(1)}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={activities}
        keyExtractor={(item) => item._id}
        renderItem={renderActivityItem}
        ItemSeparatorComponent={renderSeparator}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Cargando actividades...</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>
              No hay actividades para mostrar
            </Text>
          )
        }
        ListFooterComponent={
          pagination.currentPage < pagination.pages && !loading ? (
            <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
              <Text style={styles.loadMoreButtonText}>Cargar más</Text>
            </TouchableOpacity>
          ) : pagination.currentPage > 1 && loading ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#4A90E2" />
              <Text style={styles.loadingMoreText}>Cargando más...</Text>
            </View>
          ) : null
        }
      />

      {/* Leyenda de tipos de actividades */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Tipos de Actividades:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: getActivityColor('location_enter') }]} />
            <Text style={styles.legendText}>Entrada a zona de tarea</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: getActivityColor('location_exit') }]} />
            <Text style={styles.legendText}>Salida de zona de tarea</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: getActivityColor('task_complete') }]} />
            <Text style={styles.legendText}>Tarea completada</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: getActivityColor('task_create') }]} />
            <Text style={styles.legendText}>Tarea creada</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: getActivityColor('task_update') }]} />
            <Text style={styles.legendText}>Tarea actualizada</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: getActivityColor('task_delete') }]} />
            <Text style={styles.legendText}>Tarea eliminada</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  errorContainer: {
    backgroundColor: '#fce8e6',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#d32f2f',
    padding: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
  },
  activityItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  activityType: {
    fontWeight: 'bold',
    color: '#333',
  },
  activityTime: {
    fontSize: 12,
    color: '#888',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 5,
  },
  taskInfo: {
    backgroundColor: '#f0f4f8',
    padding: 8,
    borderRadius: 5,
    marginBottom: 8,
  },
  taskName: {
    fontWeight: 'bold',
    color: '#333',
  },
  taskDescription: {
    color: '#666',
    fontSize: 13,
    marginTop: 3,
  },
  activityMessage: {
    color: '#333',
    marginBottom: 5,
  },
  activityDateTime: {
    fontSize: 12,
    color: '#888',
  },
  metadataContainer: {
    marginTop: 8,
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
  metadataItem: {
    fontSize: 12,
    color: '#666',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginLeft: 55,
  },
  loadMoreButton: {
    backgroundColor: '#4A90E2',
    margin: 15,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadMoreButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  loadingMoreText: {
    marginLeft: 10,
    color: '#666',
  },
  legendContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 5,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});

export default AdminActivityList;
