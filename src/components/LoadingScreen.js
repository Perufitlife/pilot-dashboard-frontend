import React from 'react';
import { Plane, Loader2 } from 'lucide-react';
import '../styles/LoadingScreen.css';

function LoadingScreen({ text = 'Cargando...' }) {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <Plane size={48} strokeWidth={1.5} className="loading-icon" />
        <Loader2 size={36} className="spinner-icon" strokeWidth={2} />
        <p>{text}</p>
      </div>
    </div>
  );
}

export default LoadingScreen;