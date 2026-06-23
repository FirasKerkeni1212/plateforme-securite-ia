import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'VIEWER' // Rôle par défaut
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const navigate = useNavigate();

  // Validation des champs
  const validateForm = () => {
    if (!formData.username.trim() || formData.username.length < 3) {
      setError('Le nom d\'utilisateur doit contenir au moins 3 caractères');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Veuillez entrer une adresse email valide');
      return false;
    }
    
    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    
    return true;
  };

  // Calcul de la force du mot de passe
  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'password') {
      checkPasswordStrength(value);
    }
    
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/register', {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role
      });

      if (response.status === 201) {
        setSuccess('✅ Compte créé avec succès ! Redirection vers la page de connexion...');
        
        // Stockage temporaire pour pré-remplir le login
        sessionStorage.setItem('registeredEmail', formData.email);
        
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Inscription réussie ! Veuillez vous connecter.',
              email: formData.email 
            } 
          });
        }, 2000);
      }
    } catch (err) {
      console.error('Registration error:', err);
      
      if (err.response) {
        switch (err.response.status) {
          case 400:
            setError('Email ou nom d\'utilisateur déjà utilisé');
            break;
          case 409:
            setError('Un compte avec cet email existe déjà');
            break;
          case 422:
            setError('Données invalides. Veuillez vérifier les champs');
            break;
          default:
            setError(err.response.data?.error || 'Erreur lors de l\'inscription');
        }
      } else if (err.request) {
        setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
      } else {
        setError('Une erreur inattendue est survenue.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Indicateur de force du mot de passe
  const getPasswordStrengthLabel = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return { text: 'Très faible', color: '#ff4757' };
      case 2:
        return { text: 'Faible', color: '#ffa502' };
      case 3:
        return { text: 'Moyen', color: '#2ed573' };
      case 4:
        return { text: 'Fort', color: '#1e90ff' };
      case 5:
        return { text: 'Très fort', color: '#3742fa' };
      default:
        return { text: '', color: '#ccc' };
    }
  };

  const strengthInfo = getPasswordStrengthLabel();

  return (
    <div className="register-page">
      <div className="register-background"></div>
      
      <div className="register-card">
        {/* Logo/Icon */}
        <div className="register-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>

        {/* Title */}
        <h1 className="register-title">Créer un Compte</h1>
        <p className="register-subtitle">Rejoignez la Plateforme SOC IA</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="register-form" noValidate>
          {/* Username */}
          <div className="input-wrapper">
            <svg className="input-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            <input
              type="text"
              name="username"
              placeholder="Nom d'utilisateur"
              value={formData.username}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={50}
              autoComplete="username"
              className="register-input"
              disabled={loading}
              aria-label="Nom d'utilisateur"
            />
          </div>

          {/* Email */}
          <div className="input-wrapper">
            <svg className="input-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            <input
              type="email"
              name="email"
              placeholder="Adresse Email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className="register-input"
              disabled={loading}
              aria-label="Adresse Email"
            />
          </div>

          {/* Password */}
          <div className="input-wrapper password-wrapper">
            <svg className="input-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Mot de passe"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              autoComplete="new-password"
              className="register-input"
              disabled={loading}
              aria-label="Mot de passe"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              disabled={loading}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16c.57-.23 1.18-.36 1.83-.36zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              )}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {formData.password && (
            <div className="password-strength">
              <div className="strength-bar">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`strength-segment ${i < passwordStrength ? 'active' : ''}`}
                    style={{
                      backgroundColor: i < passwordStrength ? strengthInfo.color : '#ddd'
                    }}
                  />
                ))}
              </div>
              <span className="strength-text" style={{ color: strengthInfo.color }}>
                Force: {strengthInfo.text}
              </span>
            </div>
          )}

          {/* Confirm Password */}
          <div className="input-wrapper password-wrapper">
            <svg className="input-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Confirmer le mot de passe"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
              className="register-input"
              disabled={loading}
              aria-label="Confirmer le mot de passe"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
              aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              disabled={loading}
            >
              {showConfirmPassword ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16c.57-.23 1.18-.36 1.83-.36zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              )}
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

          {/* Terms & Conditions */}
          <div className="terms-wrapper">
            <label className="terms-checkbox">
              <input
                type="checkbox"
                required
                disabled={loading}
                aria-label="J'accepte les conditions d'utilisation"
              />
              <span>J'accepte les <a href="/terms" target="_blank" rel="noopener noreferrer">conditions d'utilisation</a> et la <a href="/privacy" target="_blank" rel="noopener noreferrer">politique de confidentialité</a></span>
            </label>
          </div>

          {/* Register Button */}
          <button 
            type="submit" 
            className="register-button" 
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Création du compte...
              </>
            ) : (
              "S'INSCRIRE"
            )}
          </button>

          {/* Login Link */}
          <div className="login-link">
            <p>Déjà un compte ? <Link to="/login" className="login-link-text">Se connecter</Link></p>
          </div>
        </form>

        {/* Footer */}
        <footer className="register-footer">
          <div className="security-badges">
            <div className="badge-item">
              <svg viewBox="0 0 24 24" fill="currentColor" className="badge-icon">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              <span>SOC 2</span>
            </div>
            <div className="badge-item">
              <svg viewBox="0 0 24 24" fill="currentColor" className="badge-icon">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>RGPD</span>
            </div>
            <div className="badge-item">
              <svg viewBox="0 0 24 24" fill="currentColor" className="badge-icon">
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

export default Register;