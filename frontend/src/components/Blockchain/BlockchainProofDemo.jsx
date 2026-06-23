import React, { useState } from 'react';

export default function BlockchainProofDemo() {
  const [showModal, setShowModal] = useState(false);

  // Données simulées pour la démo (à remplacer par tes vraies données plus tard)
  const alert = {
    id: 'alert_42',
    type: 'Ransomware Behavior',
    severity: 'CRITICAL',
    timestamp: '2026-05-26 14:30:00',
    blockchainHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    previousHash: 'a1b2c3d4e5f67890123456789012345678901234567890123456789012345678'
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      
      {/* --- FIGURE 34 : CARTE D'ALERTE AVEC BADGE --- */}
      <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
        
        {/* Header de l'alerte */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <div>
            <h2 className="text-white text-lg font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {alert.type}
            </h2>
            <p className="text-slate-400 text-xs mt-1">{alert.timestamp}</p>
          </div>
          
          {/* Badge Blockchain (C'est ça qu'on veut capturer pour la Figure 34) */}
          <div className="flex flex-col items-end gap-2">
            <span className="px-3 py-1 bg-red-900/50 text-red-300 text-xs font-bold rounded-full border border-red-700">
              CRITICAL
            </span>
            <div className="flex items-center gap-1.5 bg-green-900/40 text-green-300 px-3 py-1.5 rounded-md border border-green-700/50 shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs font-bold tracking-wide">Blockchain Verified</span>
            </div>
          </div>
        </div>

        {/* Corps de l'alerte */}
        <div className="p-4 space-y-3">
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
            <p className="text-slate-300 text-sm">
              <span className="text-blue-400 font-semibold">Comportement détecté :</span> Chiffrement massif des fichiers + connexion C2 suspecte (IP: 185.x.x.x).
            </p>
          </div>
          
          <button 
            onClick={() => setShowModal(true)}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Vérifier l'intégrité Blockchain
          </button>
        </div>
      </div>

      {/* --- FIGURE 35 : MODAL DE VÉRIFICATION --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-600 w-full max-w-lg overflow-hidden transform transition-all">
            
            {/* Modal Header */}
            <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                🔐 Preuve d'Intégrité
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="bg-green-900/20 border border-green-700/50 p-3 rounded-lg flex items-center gap-3">
                <div className="bg-green-500/20 p-2 rounded-full">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-green-300 font-bold">Intégrité Validée</p>
                  <p className="text-green-200/60 text-xs">Le hash correspond au registre immuable.</p>
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Current Hash (SHA-256)</label>
                <p className="text-white font-mono text-xs bg-slate-900 p-2 rounded border border-slate-700 break-all mt-1">
                  {alert.blockchainHash}
                </p>
              </div>

              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Previous Hash</label>
                <p className="text-slate-300 font-mono text-xs bg-slate-900 p-2 rounded border border-slate-700 break-all mt-1">
                  {alert.previousHash}
                </p>
              </div>

              <div className="flex gap-3 mt-4">
                <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-medium transition text-sm">
                  📄 Exporter PDF
                </button>
                <button onClick={() => setShowModal(false)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium transition text-sm">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}