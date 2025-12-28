import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [log, setLog] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!log.trim()) {
      setError('Veuillez entrer un log à analyser');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.post('http://localhost:5000/api/analyze', {
        log: log.trim()
      });
      setResult(response.data);
    } catch (err) {
      setError('Erreur : Vérifie que ton serveur Flask tourne sur le port 5000');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>🔒 Plateforme Sécurité IA</h1>
      <p className="subtitle">Analyse automatisée de logs avec IA générative et MCP</p>

      <div className="card">
        <h2>Entrer un log à analyser</h2>
        <textarea
          value={log}
          onChange={(e) => setLog(e.target.value)}
          placeholder="Exemple : Failed password for invalid user admin from 192.168.1.100..."
          rows="8"
        />
        <button onClick={handleAnalyze} disabled={loading} className="analyze-btn">
          {loading ? 'Analyse en cours...' : 'Analyser avec l\'IA'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {result && (
        <div className="result-card">
          <h2>Résultat de l'IA</h2>
          <div className="grid">
            <div><strong>Classification :</strong> {result.classification}</div>
            <div><strong>Confiance :</strong> {(result.confidence * 100).toFixed(1)}%</div>
            <div className={result.is_anomaly ? 'danger' : 'safe'}>
              <strong>Anomalie :</strong> {result.is_anomaly ? 'OUI 🔴' : 'NON 🟢'}
            </div>
            <div className="suggestion">
              <strong>Suggestion :</strong> {result.suggestion}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;