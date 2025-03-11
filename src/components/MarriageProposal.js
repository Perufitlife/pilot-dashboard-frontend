import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, Gift } from 'lucide-react';
import '../styles/MarriageProposal.css';

function MarriageProposal({ onClose }) {
  const [answer, setAnswer] = useState(null);

  return (
    <div className="proposal-overlay">
      <motion.div 
        className="proposal-card"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
      >
        <motion.div 
          className="heart-container"
          animate={{ 
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          <Heart size={80} fill="#f43f5e" color="#f43f5e" strokeWidth={1.5} />
        </motion.div>

        <h1 className="proposal-title">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            ¿Quieres casarte conmigo?
          </motion.span>
        </h1>

        <div className="proposal-buttons">
          {!answer ? (
            <>
              <motion.button 
                className="yes-button"
                onClick={() => setAnswer('yes')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Sparkles size={18} />
                Sí, acepto
              </motion.button>
              
              <motion.button 
                className="no-button"
                onClick={() => setAnswer('no')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                No por ahora
              </motion.button>
            </>
          ) : (
            <AnimatePresence>
              <motion.div
                className="response-message"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {answer === 'yes' ? (
                  <div className="yes-response">
                    <Gift size={40} className="gift-icon" />
                    <p>¡Me has hecho la persona más feliz del mundo! ❤️</p>
                    <p className="love-note">Te amo con todo mi corazón</p>
                  </div>
                ) : (
                  <p>Entiendo... continuemos con la aplicación 😊</p>
                )}
                
                <motion.button 
                  className="continue-button"
                  onClick={onClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Continuar
                </motion.button>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Decoración con corazones */}
        <div className="floating-hearts">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="floating-heart"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${8 + Math.random() * 7}s`,
                opacity: 0.3 + Math.random() * 0.7,
                transform: `scale(${0.5 + Math.random() * 0.5})`
              }}
            >
              <Heart size={20} fill="#f43f5e" color="#f43f5e" strokeWidth={1} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default MarriageProposal;