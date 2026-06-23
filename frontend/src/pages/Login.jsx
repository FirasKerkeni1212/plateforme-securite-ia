import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './Login.css';

const Login = () => {
  // États du composant
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  // Charger les données "Remember Me" et messages de redirection
  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername');
    const savedRemember = localStorage.getItem('rememberMe');
    
    if (savedRemember === 'true' && savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
    
    // Afficher message de succès si redirection depuis l'inscription
    if (location.state?.message) {
      setSuccess(location.state.message);
    }
  }, [location.state]);

  // Configuration Axios avec intercepteur JWT
  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { 'Content-Type': 'application/json' }
  });

  // Intercepteur pour ajouter le token à chaque requête
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Gestion de la soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation côté client
    if (!username.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/login', {
        username: username.trim(),
        password: password
      });

      if (response.status === 200 && response.data.token) {
        const { token, user } = response.data;
        
        // Stockage sécurisé dans localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({
          id: user?.id,
          username: user?.username || username,
          role: user?.role || 'VIEWER',
          email: user?.email
        }));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('loginTime', new Date().toISOString());

        // Gestion "Remember Me"
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('rememberedUsername', username);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('rememberedUsername');
        }

        setSuccess('✅ Connexion réussie ! Redirection...');
        
        // Redirection vers le dashboard ou page précédente
        const from = location.state?.from?.pathname || '/dashboard';
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 1000);
        
      } else {
        setError(response.data?.error || 'Erreur de connexion');
      }
      
    } catch (err) {
      console.error('Login error:', err);
      
      // Gestion détaillée des erreurs HTTP
      if (err.response) {
        switch (err.response.status) {
          case 401:
            setError('❌ Identifiants invalides');
            break;
          case 403:
            setError('❌ Accès refusé - Compte suspendu');
            break;
          case 429:
            setError('⚠️ Trop de tentatives - Réessayez plus tard');
            break;
          default:
            setError(err.response.data?.error || 'Erreur de connexion');
        }
      } else if (err.request) {
        setError('🔌 Impossible de contacter le serveur');
      } else {
        setError('⚠️ Une erreur inattendue est survenue');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fonction Forgot Password (stub pour implémentation future)
  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Veuillez entrer votre username');
      return;
    }
    setSuccess('📧 Un lien de réinitialisation a été envoyé');
    setError('');
  };

  return (
    <div className="login-page">
      {/* Background animé */}
      <div className="login-background">
        <div className="bg-particles"></div>
        <div className="bg-grid"></div>
      </div>
      
      <div className="login-card">
        {/* Icône Profil */}
        <div className="login-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>

        {/* Titre */}
        <h1 className="login-title">Plateforme Sécurité IA</h1>
        <p className="login-subtitle">Accès Sécurisé au SOC Tunisie Telecom</p>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* Username */}
          <div className="input-wrapper">
            <svg className="input-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              autoComplete="username"
              className="login-input"
              disabled={loading}
              aria-label="Nom d'utilisateur"
            />
          </div>

          {/* Password avec Toggle Eye */}
          <div className="input-wrapper password-wrapper">
            <svg className="input-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
              className="login-input"
              disabled={loading}
              aria-label="Mot de passe"
            />
            {/* Toggle Visibility */}
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              disabled={loading}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16c.57-.23 1.18-.36 1.83-.36zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              )}
            </button>
          </div>

          {/* Options: Remember Me & Forgot Password */}
          <div className="login-options">
            <label className="remember-me">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <span>Se souvenir de moi</span>
            </label>
            <button 
              type="button" 
              className="forgot-password"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Mot de passe oublié ?
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="error-message" role="alert" aria-live="polite">
              <svg viewBox="0 0 24 24" fill="currentColor" className="error-icon">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="success-message" role="status" aria-live="polite">
              <svg viewBox="0 0 24 24" fill="currentColor" className="success-icon">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              {success}
            </div>
          )}

          {/* Bouton de connexion */}
          <button 
            type="submit" 
            className="login-button" 
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Connexion en cours...
              </>
            ) : (
              'SE CONNECTER'
            )}
          </button>

          {/* 👇 LIEN SIGN UP AJOUTÉ ICI 👇 */}
          <div className="signup-link">
            <p>Pas encore de compte ? <Link to="/register" className="signup-link-text">S'inscrire</Link></p>
          </div>
          {/* 👆 FIN LIEN SIGN UP 👆 */}
        </form>

        {/* Footer avec Badges de Sécurité */}
        <footer className="login-footer">
          <div className="security-badges" role="complementary" aria-label="Certifications de sécurité">
            <div className="badge-item" title="SOC 2 Type II Certified">
              <svg viewBox="0 0 24 24" fill="currentColor" className="badge-icon" aria-hidden="true">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              <span>SOC 2</span>
            </div>
            <div className="badge-item" title="RGPD Compliant">
              <svg viewBox="0 0 24 24" fill="currentColor" className="badge-icon" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>RGPD</span>
            </div>
            <div className="badge-item" title="ISO 27001 Certified">
              <svg viewBox="0 0 24 24" fill="currentColor" className="badge-icon" aria-hidden="true">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
              <span>ISO 27001</span>
            </div>
          </div>

          <div className="footer-content">
            <div className="copyright">
              © 2026 Plateforme SOC IA. Tous droits réservés.
            </div>
            <div className="credits">
              Développé par <strong>Firas Kerkeni</strong> | Architecture Hybride 100% On-Premise
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Login;