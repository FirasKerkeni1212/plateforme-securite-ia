import { useState } from 'react';
import './App.css';

function App() {
  const [log, setLog] = useState('Failed password for invalid user root from 91.200.12.74 port 45001 ssh2 [preauth]');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  const handleAnalyze = async () => {
    if (!log.trim()) {
      setError('Veuillez entrer un log à analyser');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ log: log.trim() })
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();
      console.log('Résultat reçu:', data);

      if (data.result) {
        setResult(data.result);
        // Ajouter à l'historique
        setHistory([
          {
            id: Date.now(),
            log: log.trim(),
            result: data.result,
            timestamp: new Date().toLocaleTimeString('fr-FR')
          },
          ...history
        ].slice(0, 10)); // Garder les 10 dernières
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('❌ Erreur: Vérifie que le serveur Flask tourne sur le port 5000');
    } finally {
      setLoading(false);
    }
  };

  const getCriticalityColor = (criticality) => {
    const level = (criticality || '').toLowerCase();
    if (level === 'critique') return 'bg-red-900 border-red-500';
    if (level === 'haute') return 'bg-orange-900 border-orange-500';
    if (level === 'moyenne') return 'bg-yellow-900 border-yellow-500';
    return 'bg-green-900 border-green-500';
  };

  const getCriticalityTextColor = (criticality) => {
    const level = (criticality || '').toLowerCase();
    if (level === 'critique') return 'text-red-300';
    if (level === 'haute') return 'text-orange-300';
    if (level === 'moyenne') return 'text-yellow-300';
    return 'text-green-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-cyan-500/30 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                🔒 Plateforme Sécurité IA
              </h1>
              <p className="text-slate-400 mt-2">Analyse automatisée de logs avec IA générative et MCP</p>
            </div>
            <div className="text-right text-sm text-slate-400">
              <p>Backend: http://localhost:5000</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Input Section */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-xl p-6 hover:border-cyan-500/40 transition-all">
              <h2
               className="text-2xl font-bold text-cyan-400 mb-4 force-nowrap">
               📝 Entrer un log à analyser
              </h2>
              
              <textarea
                value={log}
                onChange={(e) => setLog(e.target.value)}
                placeholder="Collez ici vos logs de sécurité..."
                rows="10"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono text-sm"
              />
              
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className={`w-full mt-4 py-3 px-6 rounded-lg font-bold text-lg transition-all ${
                  loading
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 transform hover:-translate-y-0.5 shadow-lg hover:shadow-cyan-500/50'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> Analyse en cours...
                  </span>
                ) : (
                  '🚀 Analyser avec l\'IA'
                )}
              </button>

              {error && (
                <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-300">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/20 rounded-xl p-6">
              <h2 className="text-cyan-400 font-bold mb-4">📊 Statistiques</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-slate-400 text-sm">Analyses effectuées</p>
                  <p className="text-2xl font-bold text-cyan-400">{history.length}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Anomalies détectées</p>
                  <p className="text-2xl font-bold text-red-400">
                    {history.filter(h => h.result.is_anomaly).length}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-700">
                  <p className="text-slate-400 text-sm">Taux détection</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {history.length > 0
                      ? ((history.filter(h => h.result.is_anomaly).length / history.length) * 100).toFixed(1)
                      : '0'}%
                  </p>
                </div>
              </div>
            </div>

            {/* Server Status */}
            <div className="bg-green-900/30 border border-green-500/20 rounded-xl p-6">
              <h3 className="text-green-400 font-bold mb-3">✅ Statut Serveurs</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Backend Flask</span>
                  <span className="text-green-400 font-bold">● En ligne</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Frontend React</span>
                  <span className="text-green-400 font-bold">● En ligne</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Prometheus</span>
                  <span className="text-green-400 font-bold">● En ligne</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Result */}
            <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-cyan-400 mb-6">🔍 Résultat de l'Analyse</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Classification */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-2">Classification</p>
                  <p className={`font-bold text-lg ${result.is_anomaly ? 'text-red-400' : 'text-green-400'}`}>
                    {result.is_anomaly ? '⚠️ Anomalie' : '✅ Normal'}
                  </p>
                </div>

                {/* Confidence */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-2">Confiance</p>
                  <p className="font-bold text-lg text-cyan-400">
                    {(result.confidence * 100).toFixed(1)}%
                  </p>
                </div>

                {/* Anomaly */}
                <div className={`${result.is_anomaly ? 'bg-red-900/30 border-red-500' : 'bg-green-900/30 border-green-500'} border rounded-lg p-4`}>
                  <p className="text-slate-400 text-sm mb-2">Statut</p>
                  <p className={`font-bold text-lg ${result.is_anomaly ? 'text-red-400' : 'text-green-400'}`}>
                    {result.is_anomaly ? '🔴 OUI' : '🟢 NON'}
                  </p>
                </div>

                {/* Criticality */}
                <div className={`${getCriticalityColor(result.criticality)} border rounded-lg p-4`}>
                  <p className="text-slate-400 text-sm mb-2">Criticité</p>
                  <p className={`font-bold text-lg ${getCriticalityTextColor(result.criticality)}`}>
                    {result.criticality ? result.criticality.toUpperCase() : 'BASSE'}
                  </p>
                </div>
              </div>

              {/* Suggestion */}
              {result.summary && (
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <p className="text-blue-400 font-bold mb-2">💡 Analyse</p>
                  <p className="text-slate-300">{result.summary}</p>
                </div>
              )}

              {/* Actions */}
              {result.actions && result.actions.length > 0 && (
                <div>
                  <h3 className="text-cyan-400 font-bold mb-4">📋 Actions Proposées</h3>
                  <div className="space-y-2">
                    {result.actions.map((action, idx) => (
                      <div key={idx} className="bg-slate-900/50 border-l-4 border-cyan-500 p-3 flex items-start gap-3">
                        <span className="text-cyan-400 font-bold">✓</span>
                        <span className="text-slate-300">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode */}
              {result.mode && (
                <div className="mt-6 p-3 bg-slate-900/50 border border-slate-700 rounded text-slate-400 text-sm">
                  📌 {result.mode}
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <div className="mt-8 bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6 flex items-center gap-2">
              📜 Historique ({history.length})
            </h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-sm">#{idx + 1}</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        item.result.is_anomaly 
                          ? 'bg-red-900/50 text-red-300' 
                          : 'bg-green-900/50 text-green-300'
                      }`}>
                        {item.result.is_anomaly ? '🚨 Anomalie' : '✅ Normal'}
                      </span>
                    </div>
                    <span className="text-slate-500 text-xs">{item.timestamp}</span>
                  </div>
                  <p className="text-slate-400 text-sm truncate font-mono">{item.log.substring(0, 80)}...</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-slate-400 text-sm">
        </div>
      </footer>
    </div>
  );
}

export default App;