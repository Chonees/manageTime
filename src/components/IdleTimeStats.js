import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useIdleTime } from '../context/IdleTimeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const IdleTimeStats = () => {
  // Obtener contextos con comprobaciones de seguridad
  const idleTimeContext = useIdleTime();
  const languageContext = useLanguage();
  const authContext = useAuth();
  
  // Verificar que los contextos estén disponibles y log para debug
  if (!idleTimeContext || !languageContext || !authContext) {
    console.log('⏱️ IdleTimeStats: Esperando inicialización de contextos...');
    return null;
  }
  
  console.log('⏱️ IdleTimeStats: Contextos cargados correctamente');
  
  // Extraer datos de los contextos con valores por defecto seguros
  const { stats = {}, getStats = () => Promise.resolve(), tracking = false, isInTaskRadius = false, currentTask = null } = idleTimeContext;
  const { t = (key) => key } = languageContext;
  const { user = null } = authContext;
  
  // Debug de los stats recibidos
  console.log('⏱️ IdleTimeStats: Stats actuales:', JSON.stringify(stats, null, 2));

  // Actualizar estadísticas cada 30 segundos
  useEffect(() => {
    if (getStats) {
      getStats().catch(err => console.error('Error al obtener estadísticas:', err));
      
      const interval = setInterval(() => {
        getStats().catch(err => console.error('Error al actualizar estadísticas:', err));
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [getStats]);

  // Siempre mostrar el componente si el usuario está autenticado
  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <MaterialCommunityIcons name="clock-time-eight-outline" size={24} color="#fff3e5" />
        <Text style={styles.headerText}>{t('productivityStats')}</Text>
      </View>

      {/* Explicación del seguimiento automático */}
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#fff3e5" />
        <Text style={styles.infoText}>
          {t('autoTrackingInfo')}
        </Text>
      </View>

      <View style={styles.statusContainer}>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: isInTaskRadius ? '#4CAF50' : '#FF9800' }
        ]} />
        <Text style={styles.statusText}>
          {isInTaskRadius
            ? `${t('activeOnTask')}: ${currentTask?.title || t('unknownTask')}`
            : t('idle')}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t('productive')}</Text>
          <Text style={styles.statValue}>{stats.productiveMinutes || 0} min</Text>
          <View style={styles.barContainer}>
            <View
              style={[
                styles.barFill,
                { width: `${stats.productivePercentage || 0}%`, backgroundColor: '#4CAF50' }
              ]}
            />
          </View>
          <Text style={styles.statPercentage}>{stats.productivePercentage || 0}%</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t('idle')}</Text>
          <Text style={styles.statValue}>{stats.idleMinutes || 0} min</Text>
          <View style={styles.barContainer}>
            <View
              style={[
                styles.barFill,
                { width: `${stats.idlePercentage || 0}%`, backgroundColor: '#FF9800' }
              ]}
            />
          </View>
          <Text style={styles.statPercentage}>{stats.idlePercentage || 0}%</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t('total')}</Text>
          <Text style={styles.statValue}>{stats.totalMinutes || 0} min</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    marginHorizontal: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    color: '#fff3e5',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a3a',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  infoText: {
    color: '#fff3e5',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  statsContainer: {
    marginTop: 10,
  },
  statItem: {
    marginBottom: 12,
  },
  statLabel: {
    color: '#fff3e5',
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff3e5',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  barContainer: {
    height: 8,
    backgroundColor: '#555',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  statPercentage: {
    color: '#fff3e5',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    color: '#fff3e5',
    fontSize: 14,
  },
});

export default IdleTimeStats;
