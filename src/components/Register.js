// src/components/Register.js
import React, { useState } from 'react';
import supabase from '../services/supabase';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      // Registrar usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      
      if (error) throw error;
      
      // Si el registro es exitoso, añadir datos a la tabla users
      if (data.user) {
        // Calcular fecha de expiración del periodo de prueba (3 días desde ahora)
        const trialExpiration = new Date();
        trialExpiration.setDate(trialExpiration.getDate() + 3);
        
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              user_id: data.user.id,
              name,
              email,
              trial_expiration: trialExpiration.toISOString(),
            },
          ]);
        
        if (insertError) throw insertError;
        
        setSuccess(true);
        console.log('Registro exitoso');
      }
    } catch (error) {
      console.error('Error al registrar:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <h2>Registro de Usuario</h2>
      {error && <div className="error-message">{error}</div>}
      {success && (
        <div className="success-message">
          ¡Registro completado con éxito! Verifica tu correo electrónico para confirmar tu cuenta.
        </div>
      )}
      {!success && (
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="name">Nombre</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
      )}
    </div>
  );
}

export default Register;