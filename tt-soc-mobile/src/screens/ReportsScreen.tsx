import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, Share, Dimensions, ActivityIndicator, Platform
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
// @ts-ignore
import { PieChart, BarChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../api/axiosConfig';

type RootStackParamList = { Reports: undefined; Dashboard: undefined };
type Props = NativeStackScreenProps<RootStackParamList, 'Reports'>;

interface AlertItem {
  id: string;
  attack_type: string;
  severity: string;
  timestamp: string;
}

interface ReportStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  lastUpdate: string;
}

export default function ReportsScreen({ navigation }: Props) {
  const [allAlerts, setAllAlerts] = useState<AlertItem[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  
  // 📅 Filtre par jour
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/alerts?limit=500');
      setAllAlerts(res.data.alerts || []);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les rapports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  // ✅ Filtrage réel selon la période
  useEffect(() => {
    if (allAlerts.length === 0) return;

    const now = new Date();
    let filtered = allAlerts;

    if (period === 'today') {
      filtered = allAlerts.filter(a => {
        const d = new Date(a.timestamp);
        return d.toDateString() === now.toDateString();
      });
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = allAlerts.filter(a => new Date(a.timestamp) >= weekAgo);
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = allAlerts.filter(a => new Date(a.timestamp) >= monthAgo);
    } else if (period === 'custom') {
      // 📅 Filtre par jour sélectionné
      filtered = allAlerts.filter(a => {
        const d = new Date(a.timestamp);
        return d.toDateString() === selectedDate.toDateString();
      });
    }

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

    filtered.forEach(a => {
      byType[a.attack_type] = (byType[a.attack_type] || 0) + 1;
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
    });

    setStats({
      total: filtered.length,
      byType,
      bySeverity,
      lastUpdate: new Date().toLocaleString('fr-FR')
    });
  }, [allAlerts, period, selectedDate]);

  const pieData = stats ? Object.entries(stats.byType).map(([name, population], index) => ({
    name, population,
    color: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'][index % 5],
    legendFontColor: '#cbd5e1', legendFontSize: 11
  })) : [];

  const barData = stats ? {
    labels: ['CRIT', 'HIGH', 'MED', 'LOW'],
    datasets: [{
      data: [
        stats.bySeverity.CRITICAL || 0,
        stats.bySeverity.HIGH || 0,
        stats.bySeverity.MEDIUM || 0,
        stats.bySeverity.LOW || 0
      ]
    }]
  } : null;

  const handleExport = async () => {
    const periodLabel = period === 'today' ? "Aujourd'hui" 
      : period === 'week' ? 'Semaine' 
      : period === 'month' ? 'Mois' 
      : selectedDate.toLocaleDateString('fr-FR');

    const report = `
🛡️ RAPPORT SOC - Tunisie Telecom
Généré le: ${new Date().toLocaleString('fr-FR')}
Période: ${periodLabel}
─────────────────────────────
📊 STATISTIQUES
- Total alertes: ${stats?.total || 0}
- Critiques: ${stats?.bySeverity.CRITICAL || 0}
- Élevées: ${stats?.bySeverity.HIGH || 0}

🎯 PAR TYPE
${Object.entries(stats?.byType || {}).map(([t, c]) => `• ${t}: ${c}`).join('\n')}

⚠️ PAR SÉVÉRITÉ
- CRITICAL: ${stats?.bySeverity.CRITICAL || 0}
- HIGH: ${stats?.bySeverity.HIGH || 0}
- MEDIUM: ${stats?.bySeverity.MEDIUM || 0}
- LOW: ${stats?.bySeverity.LOW || 0}
─────────────────────────────
✅ SOC IA Platform - Tunisie Telecom
    `;
    try {
      await Share.share({ message: report, title: 'Rapport SOC' });
    } catch { Alert.alert('Export', 'Partage annulé'); }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Génération des rapports...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Rapports SOC</Text>
        <Text style={styles.headerSubtitle}>Analyse et statistiques</Text>
      </View>

      {/* Filtres période */}
      <View style={styles.filters}>
        <Text style={styles.filterLabel}>Période:</Text>
        <View style={styles.filterButtons}>
          {(['today', 'week', 'month'] as const).map(p => (
            <TouchableOpacity 
              key={p} 
              style={[styles.filterButton, period === p && styles.filterButtonActive]} 
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.filterButtonText, period === p && styles.filterButtonTextActive]}>
                {p === 'today' ? "Aujourd'hui" : p === 'week' ? 'Semaine' : 'Mois'}
              </Text>
            </TouchableOpacity>
          ))}
          {/* 📅 Bouton Jour Spécifique */}
          <TouchableOpacity 
            style={[styles.filterButton, period === 'custom' && styles.filterButtonActive]}
            onPress={() => { setPeriod('custom'); setShowDatePicker(true); }}
          >
            <Text style={[styles.filterButtonText, period === 'custom' && styles.filterButtonTextActive]}>
              📅 Jour
            </Text>
          </TouchableOpacity>
        </View>

        {/* Affichage date sélectionnée */}
        {period === 'custom' && (
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateDisplay}>
            <Text style={styles.dateDisplayText}>
              📅 {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.total || 0}</Text>
          <Text style={styles.statLabel}>Total Alertes</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#ef4444' }]}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats?.bySeverity.CRITICAL || 0}</Text>
          <Text style={styles.statLabel}>Critiques</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#f97316' }]}>
          <Text style={[styles.statValue, { color: '#f97316' }]}>{stats?.bySeverity.HIGH || 0}</Text>
          <Text style={styles.statLabel}>Élevées</Text>
        </View>
      </View>

      {/* Message si aucune donnée */}
      {stats?.total === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>Aucune alerte</Text>
          <Text style={styles.emptySubtext}>
            {period === 'custom' 
              ? `Aucune attaque le ${selectedDate.toLocaleDateString('fr-FR')}`
              : 'Aucune attaque sur cette période'}
          </Text>
        </View>
      )}

      {/* Camembert */}
      {pieData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Répartition par Type</Text>
          {/* @ts-ignore */}
          <PieChart 
            data={pieData} 
            width={Dimensions.get('window').width - 40} 
            height={220}
            chartConfig={{ color: (o = 1) => `rgba(255,255,255,${o})` }} 
            accessor="population"
            backgroundColor="transparent" 
            paddingLeft="15" 
            absolute 
          />
        </View>
      )}

      {/* Barres */}
      {barData && stats && stats.total > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Niveau de Sévérité</Text>
          {/* @ts-ignore */}
          <BarChart
            data={barData}
            width={Dimensions.get('window').width - 40}
            height={180}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: '#1e293b',
              backgroundGradientFrom: '#1e293b',
              backgroundGradientTo: '#1e293b',
              color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              style: { borderRadius: 16 }
            }}
            style={{ marginVertical: 8, borderRadius: 16 }}
            fromZero
          />
        </View>
      )}

      {/* Export */}
      <View style={styles.exportSection}>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Text style={styles.exportIcon}>📤</Text>
          <Text style={styles.exportText}>Exporter le rapport</Text>
        </TouchableOpacity>
        <Text style={styles.exportHint}>Formats: PDF, CSV, Partage</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Dernière synchronisation: {stats?.lastUpdate}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12 },
  header: { padding: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  backButton: { marginBottom: 8 },
  backButtonText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#94a3b8' },
  filters: { padding: 16, backgroundColor: '#1e293b', margin: 16, borderRadius: 12 },
  filterLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 10 },
  filterButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#334155' },
  filterButtonActive: { backgroundColor: '#3b82f6' },
  filterButtonText: { color: '#cbd5e1', fontSize: 12 },
  filterButtonTextActive: { color: '#fff', fontWeight: '600' },
  dateDisplay: { marginTop: 12, padding: 10, backgroundColor: '#0f172a', borderRadius: 8, alignItems: 'center' },
  dateDisplayText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  emptyState: { alignItems: 'center', padding: 32, margin: 16, backgroundColor: '#1e293b', borderRadius: 12 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  emptySubtext: { fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  exportSection: { padding: 20, alignItems: 'center' },
  exportButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginBottom: 8 },
  exportIcon: { fontSize: 20, marginRight: 10 },
  exportText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  exportHint: { color: '#64748b', fontSize: 12 },
  footer: { padding: 16, alignItems: 'center', paddingBottom: 30 },
  footerText: { color: '#64748b', fontSize: 12 }
});