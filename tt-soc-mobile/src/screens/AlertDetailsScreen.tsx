import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../api/axiosConfig';

type RootStackParamList = {
  AlertDetails: { alertId: string };
  Dashboard: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'AlertDetails'>;

export default function AlertDetailsScreen({ route, navigation }: Props) {
  const { alertId } = route.params;
  
  // Données factices pour la démo (à remplacer par un appel API)
  const alert = {
    id: alertId,
    attack_type: 'Brute Force',
    severity: 'HIGH',
    confidence: 0.88,
    timestamp: new Date().toISOString(),
    log_preview: 'Failed password for admin from 192.168.1.100 port 22',
    status: 'NEW',
    actions_recommended: ['Bloquer IP', 'Activer fail2ban']
  };

  const handleBlockIP = () => {
    Alert.alert('Action', `IP bloquée avec succès !`);
  };

  const getSeverityColor = () => {
    switch(alert.severity) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#eab308';
      default: return '#22c55e';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de l'Alerte</Text>
      </View>

      {/* Badge Sévérité */}
      <View style={[styles.severityBadge, { backgroundColor: getSeverityColor() }]}>
        <Text style={styles.severityText}>{alert.severity}</Text>
      </View>

      {/* Type d'attaque */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Type d'Attaque</Text>
        <Text style={styles.value}>{alert.attack_type}</Text>
      </View>

      {/* Confiance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Niveau de Confiance</Text>
        <Text style={styles.value}>{(alert.confidence * 100).toFixed(0)}%</Text>
      </View>

      {/* Log Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Log Concerné</Text>
        <View style={styles.logBox}>
          <Text style={styles.logText}>{alert.log_preview}</Text>
        </View>
      </View>

      {/* Actions Recommandées */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions Recommandées</Text>
        {alert.actions_recommended.map((action, index) => (
          <View key={index} style={styles.actionItem}>
            <Text style={styles.actionBullet}>•</Text>
            <Text style={styles.actionText}>{action}</Text>
          </View>
        ))}
      </View>

      {/* Boutons d'Action */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton} onPress={handleBlockIP}>
          <Text style={styles.actionButtonText}>🚫 Bloquer l'IP</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.ackButton]}>
          <Text style={styles.actionButtonText}>✅ Acquitter l'Alerte</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  backButton: { marginBottom: 10 },
  backButtonText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  
  severityBadge: { alignSelf: 'center', marginTop: -20, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  severityText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  sectionTitle: { fontSize: 14, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' },
  value: { fontSize: 16, color: '#fff', fontWeight: '600' },
  
  logBox: { backgroundColor: '#1e293b', padding: 12, borderRadius: 8 },
  logText: { color: '#cbd5e1', fontFamily: 'monospace', fontSize: 12 },
  
  actionItem: { flexDirection: 'row', marginBottom: 8 },
  actionBullet: { color: '#3b82f6', marginRight: 8, fontSize: 16 },
  actionText: { color: '#cbd5e1', fontSize: 14 },
  
  actionsSection: { padding: 20 },
  actionButton: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  ackButton: { backgroundColor: '#22c55e' },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});