import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, SafeAreaView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocationHistory } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TrackingHistoryScreen = () => {
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();

  const loadTrackingHistory = async () => {
    try {
      setLoading(true);
      console.log('Loading tracking history...');
      const history = await getLocationHistory();
      console.log('Raw history data:', JSON.stringify(history, null, 2));
      
      if (!Array.isArray(history)) {
        console.error('History data is not an array:', history);
        return;
      }

      // Sort all points by date
      const sortedPoints = history
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      console.log('Sorted points:', JSON.stringify(sortedPoints, null, 2));
      setTrackingHistory(sortedPoints);
    } catch (error) {
      console.error('Error loading tracking history:', error);
      Alert.alert(t('error'), t('errorLoadingTrackingHistory'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTrackingHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTrackingHistory();
  };

  const renderItem = ({ item }) => (
    <View style={styles.historyItem}>
      <View style={styles.locationInfo}>
        <Text style={styles.coordinates}>
          {t('latitude')}: {item.latitude.toFixed(6)}, {t('longitude')}: {item.longitude.toFixed(6)}
        </Text>
        <Text style={styles.timestamp}>
          {format(new Date(item.timestamp), "PPpp", { locale: es })}
        </Text>
        <Text style={[
          styles.typeText,
          item.type === 'start' && styles.startType,
          item.type === 'end' && styles.endType,
          item.type === 'tracking' && styles.trackingType
        ]}>
          {item.type === 'start' ? t('workStarted') : 
           item.type === 'end' ? t('workEnded') : 
           t('trackingPoint')}
        </Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('trackingHistory')}</Text>
      </View>
      
      <FlatList
        data={trackingHistory}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('noTrackingPoints')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  listContainer: {
    padding: 16,
  },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationInfo: {
    flex: 1,
  },
  coordinates: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  typeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  startType: {
    backgroundColor: '#e0f7fa',
    borderRadius: 4,
    padding: 4,
  },
  endType: {
    backgroundColor: '#fff9c4',
    borderRadius: 4,
    padding: 4,
  },
  trackingType: {
    backgroundColor: '#fff3e0',
    borderRadius: 4,
    padding: 4,
  },
});

export default TrackingHistoryScreen; 