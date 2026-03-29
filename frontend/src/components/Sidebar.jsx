import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role'); // Récupère le rôle ('admin' ou 'analyst')
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <div className="w-64 bg-gray-800 h-screen text-white flex flex-col p-4">
      <h2 className="text-xl font-bold mb-8 text-blue-400">SOC Platform</h2>
      
      <div className="flex-1 space-y-4">
        <Link to="/dashboard" className="block p-2 hover:bg-gray-700 rounded">📊 Dashboard</Link>
        <Link to="/analyze" className="block p-2 hover:bg-gray-700 rounded">📥 Analyser Log</Link>
        <Link to="/chatbot" className="block p-2 hover:bg-gray-700 rounded">🤖 Chatbot IA</Link>
        
        {/* 👇 CETTE PARTIE N'APPARAÎT QUE SI ROLE === 'ADMIN' */}
        {role === 'admin' && (
          <>
            <div className="border-t border-gray-600 my-2"></div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Administration</p>
            <Link to="/users" className="block p-2 hover:bg-red-900 text-red-300 rounded">
              👥 Gestion Utilisateurs
            </Link>
            <Link to="/settings" className="block p-2 hover:bg-red-900 text-red-300 rounded">
              ⚙️ Paramètres Système
            </Link>
          </>
        )}
      </div>

      <div className="mt-auto">
        <div className="text-sm text-gray-400 mb-2">Connecté : <span className="text-white">{username}</span></div>
        <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 py-2 rounded">
          Déconnexion
        </button>
      </div>
    </div>
  );
};

export default Sidebar;