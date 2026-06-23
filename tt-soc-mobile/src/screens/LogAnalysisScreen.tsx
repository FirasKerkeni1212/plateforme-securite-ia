import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Alert, ActivityIndicator 
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../api/axiosConfig';

type RootStackParamList = {
  LogAnalysis: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'LogAnalysis'>;

export default function LogAnalysisScreen({ navigation }: Props) {
  const [logText, setLogText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyzeLog = async () => {
    if (!logText.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un log à analyser');
      return;
    }

    setAnalyzing(true);
    try {
      const res = await api.post('/analyze', { log: logText });
      setResult(res.data.result);
      
      if (res.data.result.is_anomaly) {
        Alert.alert(
          '⚠️ Anomalie Détectée',
          `Type: ${res.data.result.attack_type}\nSévérité: ${res.data.result.criticality}\nConfiance: ${(res.data.result.confidence * 100).toFixed(0)}%`
        );
      } else {
        Alert.alert('✅ Trafic Normal', 'Aucune menace détectée dans ce log');
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible d\'analyser le log');
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔍 Analyser un Log</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Input Zone */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Collez vos logs ci-dessous :</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Ex: Failed password for admin from 192.168.1.100..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={8}
            value={logText}
            onChangeText={setLogText}
          />
        </View>

        {/* Analyze Button */}
        <TouchableOpacity 
          style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled]} 
          onPress={analyzeLog}
          disabled={analyzing}
        >
          {analyzing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.analyzeButtonText}>🚀 Analyser le Log</Text>
          )}
        </TouchableOpacity>

        {/* Results */}
        {result && (
          <View style={styles.resultSection}>
            <View style={[
              styles.resultCard,
              { borderLeftColor: result.is_anomaly ? '#ef4444' : '#22c55e' }
            ]}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultIcon}>
                  {result.is_anomaly ? '🚨' : '✅'}
                </Text>
                <Text style={[
                  styles.resultTitle,
                  { color: result.is_anomaly ? '#ef4444' : '#22c55e' }
                ]}>
                  {result.is_anomaly ? 'Anomalie Détectée' : 'Trafic Normal'}
                </Text>
              </View>

              {result.is_anomaly && (
                <>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Type d'attaque:</Text>
                    <Text style={styles.resultValue}>{result.attack_type}</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Sévérité:</Text>
                    <Text style={[
                      styles.resultValue,
                      { color: result.criticality === 'CRITICAL' ? '#ef4444' : '#f97316' }
                    ]}>
                      {result.criticality}
                    </Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Confiance:</Text>
                    <Text style={styles.resultValue}>{(result.confidence * 100).toFixed(0)}%</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Résumé:</Text>
                    <Text style={styles.resultSummary}>{result.summary}</Text>
                  </View>

                  <View style={styles.actionsSection}>
                    <Text style={styles.actionsTitle}>⚡ Actions Recommandées:</Text>
                    {result.actions?.map((action: string, index: number) => (
                      <View key={index} style={styles.actionItem}>
                        <Text style={styles.actionBullet}>•</Text>
                        <Text style={styles.actionText}>{action}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {!result.is_anomaly && (
                <Text style={styles.normalSummary}>
                  {result.summary}
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { 
    padding: 20, backgroundColor: '#1e293b', 
    borderBottomWidth: 1, borderBottomColor: '#334155' 
  },
  backButton: { marginBottom: 10 },
  backButtonText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  scrollView: { flex: 1, padding: 16 },
  
  inputSection: { marginBottom: 20 },
  label: { color: '#94a3b8', fontSize: 14, marginBottom: 8 },
  textArea: { 
    backgroundColor: '#1e293b', color: '#fff', 
    borderRadius: 10, padding: 12, minHeight: 150, 
    textAlignVertical: 'top', fontSize: 13 
  },
  
  analyzeButton: { 
    backgroundColor: '#3b82f6', padding: 16, 
    borderRadius: 10, alignItems: 'center', marginBottom: 20 
  },
  analyzeButtonDisabled: { backgroundColor: '#64748b' },
  analyzeButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  resultSection: { marginBottom: 20 },
  resultCard: { 
    backgroundColor: '#1e293b', borderRadius: 12, 
    padding: 16, borderLeftWidth: 4, borderLeftColor: '#ef4444' 
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  resultIcon: { fontSize: 24, marginRight: 12 },
  resultTitle: { fontSize: 18, fontWeight: 'bold' },
  resultRow: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    marginBottom: 12, paddingBottom: 12, 
    borderBottomWidth: 1, borderBottomColor: '#334155' 
  },
  resultLabel: { color: '#94a3b8', fontSize: 14 },
  resultValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  resultSummary: { color: '#cbd5e1', fontSize: 13, lineHeight: 18, marginTop: 8 },
  normalSummary: { color: '#22c55e', fontSize: 14, textAlign: 'center', marginTop: 8 },
  
  actionsSection: { marginTop: 16 },
  actionsTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  actionItem: { flexDirection: 'row', marginBottom: 6 },
  actionBullet: { color: '#3b82f6', marginRight: 8, fontSize: 14 },
  actionText: { color: '#cbd5e1', fontSize: 13, flex: 1 },
});