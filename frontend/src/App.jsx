import { useState } from 'react';
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
      console.log('Résultat reçu du backend :', data);

      // Le backend retourne déjà du JSON structuré, pas besoin de parser !
      setResult(data);
    } catch (err) {
      console.error('Erreur API :', err);
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
          placeholder="Colle ici un ou plusieurs logs de sécurité..."
          rows="10"
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
            {/* Classification */}
            <div>
              <strong>Classification :</strong>{' '}
              {result.is_anomaly ? (
                <span className="text-red-500 font-bold">Anomalie détectée</span>
              ) : (
                <span className="text-green-500 font-bold">Trafic normal</span>
              )}
            </div>

            {/* Confiance */}
            <div>
              <strong>Confiance :</strong>{' '}
              {(result.confidence * 100).toFixed(1)}%
            </div>

            {/* Badge Anomalie */}
            <div className={result.is_anomaly ? 'danger' : 'safe'}>
              <strong>Anomalie :</strong>{' '}
              {result.is_anomaly ? 'OUI 🔴' : 'NON 🟢'}
            </div>

            {/* Criticité */}
            <div>
              <strong>Criticité :</strong>{' '}
              <span className={
                (result.criticality || '').toLowerCase() === 'critique' ? 'text-red-600 font-bold' :
                (result.criticality || '').toLowerCase() === 'haute'   ? 'text-orange-500 font-bold' :
                (result.criticality || '').toLowerCase() === 'moyenne' ? 'text-yellow-500 font-medium' :
                'text-green-500 font-bold'
              }>
                {result.criticality
                  ? result.criticality.charAt(0).toUpperCase() + result.criticality.slice(1)
                  : 'Basse'}
              </span>
            </div>

            {/* Suggestion */}
            <div className="suggestion">
              <strong>Suggestion :</strong>{' '}
              {result.summary || 'Aucune suggestion'}
            </div>

            {/* Actions détaillées si présentes */}
            {result.actions && result.actions.length > 0 && (
              <div className="actions-list" style={{ gridColumn: '1 / -1', marginTop: '15px' }}>
                <strong>Actions proposées :</strong>
                <ul style={{ marginTop: '10px' }}>
                  {result.actions.map((action, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>
                      ✓ {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;