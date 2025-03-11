import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import supabase from './services/supabase';
import { Plane, Loader2 } from 'lucide-react';

function App() {
  const [showLogin, setShowLogin] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Session checking with improved error handling
  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      
      // Set user and manage authentication state
      setUser(data?.session?.user || null);
      
      // Setup authentication state change listener
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user || null);
        
        // Handle different authentication events
        switch (event) {
          case 'SIGNED_IN':
            setAuthError(null);
            break;
          case 'SIGNED_OUT':
            setAuthError(null);
            break;
          case 'PASSWORD_RECOVERY':
            // Código para PASSWORD_RECOVERY
            break;
          default:
            break;
        }
        
      });
      
      return () => {
        if (authListener && authListener.subscription) {
          authListener.subscription.unsubscribe();
        }
      };
    } catch (error) {
      console.error('Session check error:', error);
      setAuthError('No se pudo verificar la sesión');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial session check
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Logout handler with error management
  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setAuthError(null);
    } catch (error) {
      console.error('Logout error:', error);
      setAuthError('Error al cerrar sesión');
    } finally {
      setLoading(false);
    }
  }, []);

  // Loading state with animated spinner
  if (loading) {
    return (
      <motion.div 
        className="loading-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="loading-content"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 300 
          }}
        >
          <Plane 
            size={64} 
            strokeWidth={1.5} 
            className="loading-icon" 
          />
          <Loader2 
            size={48} 
            className="spinner-icon" 
            strokeWidth={2}
          />
          <p>Cargando Pilot Dashboard...</p>
        </motion.div>
      </motion.div>
    );
  }

  // Main application render
  return (
    <div className="App">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <motion.div 
          className="auth-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="auth-container">
            {/* Navigation Tabs */}
            <div className="auth-navigation">
              <button 
                className={showLogin ? 'active' : ''} 
                onClick={() => {
                  setShowLogin(true);
                  setAuthError(null);
                }}
              >
                Iniciar Sesión
              </button>
              <button 
                className={!showLogin ? 'active' : ''} 
                onClick={() => {
                  setShowLogin(false);
                  setAuthError(null);
                }}
              >
                Registrarse
              </button>
            </div>

            {/* Authentication Content */}
            <div className="auth-content">
              {/* Header */}
              <div className="auth-header">
                <motion.div
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Plane 
                    strokeWidth={2} 
                    className="auth-logo" 
                    size={48}
                  />
                </motion.div>
                <h1>Pilot Dashboard</h1>
                <p>Tu portal profesional de aviación</p>
              </div>

              {/* Global Auth Error */}
              {authError && (
                <motion.div 
                  className="auth-error"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {authError}
                </motion.div>
              )}

              {/* Animated Authentication Forms */}
              <div className="auth-forms-container">
                <AnimatePresence mode="wait">
                  {showLogin ? (
                    <motion.div
                      key="login"
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      transition={{ duration: 0.3 }}
                      style={{ width: "100%" }}
                    >
                      <Login 
                        onLogin={setUser} 
                        onError={setAuthError}
                        onSwitchToRegister={() => setShowLogin(false)}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="register"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                      style={{ width: "100%" }}
                    >
                      <Register 
                        onRegister={setUser} 
                        onError={setAuthError}
                        onSwitchToLogin={() => setShowLogin(true)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default App;