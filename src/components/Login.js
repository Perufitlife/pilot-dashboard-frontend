import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  AlertTriangle, 
  LogIn,
  Check,
  Sun,
  Moon,
  Github,
  MessagesSquare // Reemplazamos Google por MessagesSquare
} from 'lucide-react';
import supabase from '../services/supabase';
import '../styles/Login.css';

function Login({ onLogin, onSwitchToRegister }) {
  // Estados
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Referencias
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Efecto para manejar tema oscuro/claro
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }, []);

  // Alternador de tema oscuro/claro
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.setAttribute('data-theme', isDarkMode ? 'light' : 'dark');
  };

  // Validación de email
  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  // Verificador de fortaleza de contraseña
  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length > 7) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[$@#&!]+/)) strength++;
    return strength;
  };

  // Manejador de cambio de email
  const handleEmailChange = (e) => {
    const inputEmail = e.target.value;
    setEmail(inputEmail);
    setEmailValid(validateEmail(inputEmail));
  };

  // Manejador de cambio de contraseña
  const handlePasswordChange = (e) => {
    const inputPassword = e.target.value;
    setPassword(inputPassword);
    setPasswordStrength(checkPasswordStrength(inputPassword));
  };

  // Obtener texto descriptivo para la fortaleza de la contraseña
  const getPasswordStrengthText = () => {
    if (password.length === 0) return '';
    if (passwordStrength <= 1) return 'Muy débil';
    if (passwordStrength === 2) return 'Débil';
    if (passwordStrength === 3) return 'Media';
    if (passwordStrength === 4) return 'Fuerte';
    return 'Muy fuerte';
  };

// Modifica la función handleLogin en tu archivo Login.js
const handleLogin = async (e) => {
  e.preventDefault();
  
  // Validar entradas antes de enviar
  if (!emailValid) {
    setError('Por favor, ingresa un correo electrónico válido');
    emailInputRef.current?.focus();
    return;
  }

  if (password.length < 8) {
    setError('La contraseña debe tener al menos 8 caracteres');
    passwordInputRef.current?.focus();
    return;
  }

  try {
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (data.user) {
      setLoginSuccess(true);
      
      // Pequeña demora para mostrar la animación de éxito
      setTimeout(() => {
        // Verificar si el email es el correo especial
        if (email.toLowerCase() === 'j.fabrisvelasquez@gmail.com') {
          // Mostrar la propuesta de matrimonio
          onLogin(data.user, true);
        } else {
          onLogin(data.user, false);
        }
      }, 1000);
    }
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    setError(error.message === 'Invalid login credentials' 
      ? 'Correo o contraseña incorrectos' 
      : 'No pudimos iniciar sesión. Por favor, verifica tus credenciales e intenta de nuevo.');
  } finally {
    setLoading(false);
  }
};


  // Manejador de recuperación de contraseña
  const handlePasswordReset = () => {
    if (!email || !emailValid) {
      setError('Ingresa un correo electrónico válido para recuperar tu contraseña');
      emailInputRef.current?.focus();
      return;
    }
    
    // Aquí iría la lógica de recuperación de contraseña
    alert(`Se enviará un correo de recuperación a: ${email}`);
  };

  // Animaciones para la tarjeta
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.4,
        ease: "easeOut"
      } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: { 
        duration: 0.2,
        ease: "easeIn"
      } 
    }
  };

  return (
    <div className="login-container">
      <motion.div 
        className="login-card"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Header del formulario */}
        <div className="form-header">
          <h1 className="login-title">Bienvenido de nuevo</h1>
          <p className="login-subtitle">Accede a tu cuenta para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {/* Mensaje de error */}
          <AnimatePresence>
            {error && (
              <motion.div 
                className="error-message"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <AlertTriangle size={20} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Campo de email */}
          <div className="form-group">
            <label htmlFor="email">
              Correo Electrónico
            </label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                ref={emailInputRef}
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="usuario@ejemplo.com"
                required
                autoComplete="email"
                className={emailValid && email ? 'valid' : ''}
                disabled={loading || loginSuccess}
              />
              {emailValid && email && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="input-validation"
                >
                  <Check size={18} color="#10b981" />
                </motion.div>
              )}
            </div>
          </div>

          {/* Campo de contraseña */}
          <div className="form-group">
            <label htmlFor="password">
              Contraseña
            </label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                ref={passwordInputRef}
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={handlePasswordChange}
                onFocus={() => setPasswordFocus(true)}
                onBlur={() => setPasswordFocus(false)}
                placeholder="********"
                required
                autoComplete="current-password"
                disabled={loading || loginSuccess}
              />
              {/* Indicador de fortaleza de contraseña */}
              <div className="password-strength">
                {[...Array(5)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    className={`strength-bar ${
                      i < passwordStrength ? 'active' : ''
                    }`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: password && i < passwordStrength ? 1 : 0.9 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  ></motion.div>
                ))}
              </div>

              {/* Botón para mostrar/ocultar contraseña */}
              <motion.button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                whileTap={{ scale: 0.9 }}
                disabled={loading || loginSuccess}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </motion.button>
            </div>
            
            {/* Texto descriptivo de fortaleza (visible solo cuando está enfocado) */}
            <AnimatePresence>
              {passwordFocus && password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ 
                    fontSize: '12px', 
                    marginTop: '6px',
                    color: 
                      passwordStrength <= 1 ? '#ef4444' : 
                      passwordStrength === 2 ? '#f97316' : 
                      passwordStrength === 3 ? '#eab308' : 
                      passwordStrength === 4 ? '#22c55e' : '#10b981'
                  }}
                >
                  {getPasswordStrengthText()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Acciones del formulario */}
          <div className="form-actions">
            <motion.button 
              type="submit" 
              className="login-button"
              disabled={loading || !emailValid || password.length < 8 || loginSuccess}
              whileHover={!loading && emailValid && password.length >= 8 && !loginSuccess ? { y: -2 } : {}}
              whileTap={!loading && emailValid && password.length >= 8 && !loginSuccess ? { y: 0 } : {}}
            >
              {loginSuccess ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <Check size={22} />
                </motion.div>
              ) : loading ? (
                <div className="button-loader">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Otras opciones de login */}
          <div className="separator">o continúa con</div>
          
          <div className="social-login">
            <motion.button 
              type="button" 
              className="social-button"
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              disabled={loading || loginSuccess}
            >
              <MessagesSquare size={18} /> {/* Cambiado de Google a MessagesSquare */}
              <span>Gmail</span>
            </motion.button>
            
            <motion.button 
              type="button" 
              className="social-button"
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              disabled={loading || loginSuccess}
            >
              <Github size={18} />
              <span>GitHub</span>
            </motion.button>
          </div>

          {/* Pie de formulario */}
          <div className="form-footer">
            <motion.button 
              type="button" 
              className="forgot-password-link"
              onClick={handlePasswordReset}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={loading || loginSuccess}
            >
              ¿Olvidaste tu contraseña?
            </motion.button>
            
            <div className="signup-prompt">
              ¿No tienes cuenta? 
              <motion.button 
                type="button" 
                className="signup-link"
                onClick={onSwitchToRegister}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={loading || loginSuccess}
              >
                Regístrate
              </motion.button>
            </div>
          </div>
        </form>
        
        {/* Botón de cambio de tema */}
        <motion.button
          className="header-control-btn"
          onClick={toggleDarkMode}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            backgroundColor: 'rgba(0,0,0,0.05)',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>
      </motion.div>
    </div>
  );
}

export default Login;