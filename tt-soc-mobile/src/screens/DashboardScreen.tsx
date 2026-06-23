import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  TouchableOpacity, ActivityIndicator, Alert, Vibration 
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import io from 'socket.io-client';
import api from '../api/axiosConfig';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  AlertDetails: { alertId: string };
  LogAnalysis: undefined;
  Chatbot: undefined;
  Reports: undefined;
  ThreatMap: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

interface AlertItem {
  id: string;
  attack_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  timestamp: string;
  log_preview: string;
  status: string;
  ip?: string;
  latitude?: number;
  longitude?: number;
}

interface KPI {
  title: string;
  value: string | number;
  trend?: string;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'blue';
}

export default function DashboardScreen({ navigation }: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const socketRef = React.useRef<ReturnType<typeof io> | null>(null);

  // 🔌 Connexion WebSocket Temps Réel
  useEffect(() => {
    console.log('🔌 Connexion WebSocket vers 192.168.1.72:5000');
    
    socketRef.current = io('http://192.168.1.72:5000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      timeout: 10000
    });

    socketRef.current.on('connect', () => {
      console.log('✅ WebSocket CONNECTÉ');
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('❌ WebSocket ERREUR:', err.message);
    });

    // 🚨 Écoute des nouvelles alertes en temps réel
    socketRef.current.on('new_alert', (newAlert: AlertItem) => {
      console.log('📱 Nouvelle alerte reçue:', newAlert.attack_type);
      
      setAlerts(prev => {
        if (prev.some(a => a.id === newAlert.id)) return prev;
        return [newAlert, ...prev];
      });

      try { Vibration.vibrate([0, 300, 100, 300]); } catch(e) {}
      
      Alert.alert(
        '🚨 ALERTE CRITIQUE',
        `${newAlert.attack_type} détectée!\nSévérité: ${newAlert.severity}`,
        [{ text: 'Voir', onPress: () => navigation.navigate('AlertDetails' as any, { alertId: newAlert.id }) }]
      );
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [navigation]);

  // ✅ FONCTION fetchDashboardData CORRIGÉE (sans doublons)
  const fetchDashboardData = async () => {
    try {
      // 1. Récupérer la liste des alertes
      const alertsRes = await api.get('/alerts?limit=10');
      const alertsData: AlertItem[] = alertsRes.data.alerts || [];
      setAlerts(alertsData);

      // 2. Récupérer les MÉTRIQUES RÉELLES (endpoint /api/metrics)
      const metricsRes = await api.get('/metrics');
      const kpisData = metricsRes.data.kpis;

      // 3. Mettre à jour les KPIs avec les vraies valeurs dynamiques
      setKpis([
        { 
          title: 'Alertes Actives', 
          value: kpisData.total_alerts, 
          trend: `+${kpisData.critical_alerts} critiques`, 
          color: 'red' 
        },
        { 
          title: 'Détection Rate', 
          value: `${kpisData.detection_rate}%`, 
          trend: kpisData.detection_rate >= 90 ? '+Excellent' : '+À améliorer', 
          color: kpisData.detection_rate >= 90 ? 'green' : 'orange' 
        },
        { 
          title: 'Logs Analysés', 
          value: kpisData.total_logs_analyzed.toLocaleString('fr-FR'),
          trend: '+Temps réel', 
          color: 'blue' 
        },
        { 
          title: 'Temps Réponse', 
          value: kpisData.avg_response_time,
          trend: '-Optimisé', 
          color: 'green' 
        },
      ]);

    } catch (err) {
      console.error('Dashboard fetch error:', err);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#eab308';
      default: return '#22c55e';
    }
  };

  const getAttackIcon = (type: string) => {
    const icons: Record<string, string> = {
      'DDoS': '🌊', 'XSS': '💻', 'Brute Force': '🔐',
      'SQL Injection': '💉', 'Ransomware': '🦠', 'Port Scan': '🌐',
      'Trojan': '🐴', 'Normal': '✅'
    };
    return icons[type] || '⚠️';
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Chargement du SOC...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛡️ SOC Mobile TT</Text>
        <Text style={styles.headerSubtitle}>Tableau de bord sécurité</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        {/* KPIs Grid */}
        <View style={styles.kpiGrid}>
          {kpis.map((kpi, index) => (
            <View key={index} style={[styles.kpiCard, { borderLeftColor: getSeverityColor(kpi.color === 'red' ? 'CRITICAL' : kpi.color === 'orange' ? 'HIGH' : 'MEDIUM') }]}>
              <Text style={styles.kpiTitle}>{kpi.title}</Text>
              <Text style={[styles.kpiValue, { color: kpi.color === 'red' ? '#ef4444' : kpi.color === 'orange' ? '#f97316' : kpi.color === 'yellow' ? '#eab308' : kpi.color === 'green' ? '#22c55e' : '#3b82f6' }]}>
                {kpi.value}
              </Text>
              {kpi.trend && <Text style={styles.kpiTrend}>{kpi.trend}</Text>}
            </View>
          ))}
        </View>

        {/* Recent Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Alertes Récentes</Text>
          {alerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyText}>Aucune alerte critique</Text>
              <Text style={styles.emptySubtext}>Le système est sécurisé</Text>
            </View>
          ) : (
            alerts.map((alert) => (
              <TouchableOpacity 
                key={alert.id} 
                style={styles.alertCard}
                onPress={() => navigation.navigate('AlertDetails' as any, { alertId: alert.id })}
              >
                <View style={styles.alertHeader}>
                  <Text style={styles.alertIcon}>{getAttackIcon(alert.attack_type)}</Text>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertType}>{alert.attack_type}</Text>
                    <Text style={styles.alertTime}>
                      {new Date(alert.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
                    <Text style={styles.severityText}>{alert.severity}</Text>
                  </View>
                </View>
                <Text style={styles.alertPreview} numberOfLines={2}>
                  {alert.log_preview}
                </Text>
                <View style={styles.alertFooter}>
                  <Text style={styles.confidence}>Confiance: {(alert.confidence * 100).toFixed(0)}%</Text>
                  <Text style={styles.status}>{alert.status}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Actions Rapides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Actions Rapides</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('LogAnalysis' as any)}
            >
              <Text style={styles.actionIcon}>🔍</Text>
              <Text style={styles.actionText}>Analyser un log</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Chatbot' as any)}
            >
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionText}>Assistant SOC</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Reports' as any)}
            >
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionText}>Rapports</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('ThreatMap' as any)}
            >
              <Text style={styles.actionIcon}>📍</Text>
              <Text style={styles.actionText}>Carte des attaques</Text>
            </TouchableOpacity>
          </View>
        </View>
        
      </ScrollView>
    </View> 
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 14 },
  
  header: { padding: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-end' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 6 },
  liveText: { color: '#22c55e', fontSize: 11, fontWeight: 'bold' },
  
  scrollView: { flex: 1 },
  
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  kpiCard: { 
    flex: 1, minWidth: '48%', backgroundColor: '#1e293b', borderRadius: 12, 
    padding: 16, borderLeftWidth: 4, borderLeftColor: '#3b82f6' 
  },
  kpiTitle: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase' },
  kpiValue: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginVertical: 4 },
  kpiTrend: { fontSize: 11, color: '#22c55e' },
  
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  
  emptyState: { alignItems: 'center', padding: 32, backgroundColor: '#1e293b', borderRadius: 12 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  emptySubtext: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  
  alertCard: { 
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: '#3b82f6'
  },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  alertIcon: { fontSize: 20, marginRight: 10 },
  alertInfo: { flex: 1 },
  alertType: { fontSize: 15, fontWeight: '600', color: '#fff' },
  alertTime: { fontSize: 12, color: '#94a3b8' },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  severityText: { fontSize: 10, fontWeight: 'bold', color: '#fff', textTransform: 'uppercase' },
  alertPreview: { fontSize: 13, color: '#cbd5e1', marginBottom: 8, lineHeight: 18 },
  alertFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  confidence: { fontSize: 11, color: '#64748b' },
  status: { fontSize: 11, color: '#22c55e', fontWeight: '500' },
  
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionButton: { 
    flex: 1, minWidth: '48%', backgroundColor: '#334155', borderRadius: 10, 
    padding: 14, alignItems: 'center' 
  },
  actionIcon: { fontSize: 24, marginBottom: 6 },
  actionText: { fontSize: 12, color: '#fff', textAlign: 'center' },
});