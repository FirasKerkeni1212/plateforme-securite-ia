import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Ledger() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = 'http://192.168.1.72:5000';

  useEffect(() => {
    fetchBlockchainData();
  }, []);

  const fetchBlockchainData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/blockchain/ledger`);
      if (response.data.success) {
        setBlocks(response.data.blocks || []);
      } else {
        setError('Impossible de récupérer les données.');
      }
    } catch (err) {
      setError('Erreur de connexion au backend.');
    } finally {
      setLoading(false);
    }
  };

  const verifyIntegrity = async (alertId) => {
    try {
      const response = await axios.get(`${API_URL}/api/blockchain/verify/${alertId}`);
      alert(response.data.integrity_status === 'VALID' ? '✅ Intégrité Validée' : '⚠️ Altération Détectée');
    } catch (err) {
      alert('Erreur vérification');
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Chargement...</div>;
  if (error) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-red-400">{error}</div>;

  return (
    // overflow-hidden empêche les éléments géants de dépasser
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">🔗 Blockchain Ledger</h1>
          <p className="text-slate-400 text-sm">Registre immuable des incidents CRITICAL</p>
        </div>

        {/* Stats KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs uppercase mb-1">Total Blocs</p>
            <p className="text-2xl font-bold text-white">{blocks.length}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs uppercase mb-1">Algorithme</p>
            <p className="text-2xl font-bold text-emerald-400">SHA-256</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs uppercase mb-1">Statut</p>
            <p className="text-2xl font-bold text-blue-400">✅ Immuable</p>
          </div>
        </div>

        {/* Liste des blocs */}
        {blocks.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">Aucun bloc enregistré</div>
        ) : (
          <div className="space-y-4">
            {blocks.map((block, index) => (
              <div key={index} className="bg-slate-800 rounded-lg p-5 border border-slate-700 shadow-sm">
                
                {/* Header Bloc */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">
                       Block #{block.index}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {new Date(block.timestamp).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <button 
                    onClick={() => verifyIntegrity(block.alert_id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium transition"
                  >
                    🔍 Vérifier
                  </button>
                </div>

                {/* Détails */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-xs uppercase mb-1">📋 Alert ID</p>
                    <p className="text-blue-300 font-mono text-sm bg-slate-900/50 p-2 rounded border border-slate-700 break-all">
                      {block.alert_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase mb-1">🔐 Current Hash</p>
                    <p className="text-emerald-300 font-mono text-xs bg-slate-900/50 p-2 rounded border border-slate-700 break-all">
                      {block.current_hash}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-slate-400 text-xs uppercase mb-1">️ Previous Hash</p>
                    <p className="text-slate-300 font-mono text-xs bg-slate-900/50 p-2 rounded border border-slate-700 break-all">
                      {block.previous_hash}
                    </p>
                  </div>
                </div>

                {/* Footer avec icône corrigée */}
                <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400">
                    {/* ✅ FIX: Taille fixe forcée width="20" height="20" pour éviter le bug géant */}
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">Chaînage valide</span>
                  </div>
                  <button className="text-slate-400 hover:text-white text-xs">📄 Exporter</button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}