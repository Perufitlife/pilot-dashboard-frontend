import React, { useState, useEffect, Suspense, useCallback } from 'react';
import {
  User,
  BookOpen,
  Briefcase,
  MessageCircle,
  FileText,
  Settings,
  Menu,
  X
} from 'lucide-react';
import supabase from '../services/supabase';
import LoadingScreen from './LoadingScreen';
import '../styles/Dashboard.css';

// Carga diferida de las secciones
const componentMap = {
  profile: React.lazy(() => import('./Profile')),
  logbook: React.lazy(() => import('./Logbook')),
  jobs: React.lazy(() => import('./JobSearch')),
  interview: React.lazy(() => import('./InterviewPrep')),
  querybot: React.lazy(() => import('./QueryBot')),
  documents: React.lazy(() => import('./DocumentManager'))
};

function Dashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Función para cerrar el menú móvil
  const closeMenu = useCallback(() => {
    console.log('Closing menu');
    setIsMenuOpen(false);
    document.body.style.overflow = '';
  }, []);

  // Función para abrir el menú móvil
  const openMenu = useCallback(() => {
    console.log('Opening menu');
    setIsMenuOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  // Toggle menú
  const toggleMenu = useCallback(() => {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [isMenuOpen, closeMenu, openMenu]);

  // Cargar sección guardada al inicio
  useEffect(() => {
    const savedSection = localStorage.getItem('activeSection');
    if (savedSection) {
      setActiveSection(savedSection);
    }
  }, []);

  // Guardar sección activa en localStorage cuando cambia
  useEffect(() => {
    localStorage.setItem('activeSection', activeSection);
  }, [activeSection]);

  // Manejar cambios de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMenuOpen) {
        closeMenu();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMenuOpen, closeMenu]);

  // Verificar sesión de usuario
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          onLogout();
          return;
        }
        
        // Simular carga para una mejor experiencia visual
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Session check error:', error);
        onLogout();
      }
    };

    verifyUser();
  }, [onLogout]);

  // Función para cambiar sección
  const handleSectionChange = (section) => {
    setActiveSection(section);
    if (window.innerWidth < 1024) {
      closeMenu();
    }
  };

  // Manejar tecla ESC para cerrar el menú
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isMenuOpen) {
        closeMenu();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [isMenuOpen, closeMenu]);

  // Mostrar pantalla de carga mientras se inicia
  if (loading) {
    return <LoadingScreen text="Cargando Dashboard..." />;
  }

  return (
    <div className="dashboard-container">
      {/* Overlay para móvil */}
      <div 
        className={`mobile-overlay ${isMenuOpen ? 'active' : ''}`} 
        onClick={closeMenu}
        aria-hidden="true"
      />
      
      {/* Sidebar */}
      <nav className={`dashboard-sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-logo">✈️</div>
          <h2>Pilot Dashboard</h2>
          <button 
            type="button"
            className="mobile-menu-close"
            onClick={closeMenu}
            aria-label="Cerrar menú"
          >
            <X size={24} />
          </button>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-details">
            <h3>{user?.email?.split('@')[0] || 'Usuario'}</h3>
            <p>{user?.email || 'email@example.com'}</p>
          </div>
        </div>

        <div className="sidebar-nav">
          <button
            type="button"
            className={activeSection === 'profile' ? 'active' : ''}
            onClick={() => handleSectionChange('profile')}
          >
            <User />
            <span>Mi Perfil</span>
          </button>
          <button
            type="button"
            className={activeSection === 'logbook' ? 'active' : ''}
            onClick={() => handleSectionChange('logbook')}
          >
            <BookOpen />
            <span>Logbook</span>
          </button>
          <button
            type="button"
            className={activeSection === 'jobs' ? 'active' : ''}
            onClick={() => handleSectionChange('jobs')}
          >
            <Briefcase />
            <span>Trabajos</span>
          </button>
          <button
            type="button"
            className={activeSection === 'interview' ? 'active' : ''}
            onClick={() => handleSectionChange('interview')}
          >
            <MessageCircle />
            <span>Entrevistas</span>
          </button>
          <button
            type="button"
            className={activeSection === 'querybot' ? 'active' : ''}
            onClick={() => handleSectionChange('querybot')}
          >
            <Settings />
            <span>Query Bot</span>
          </button>
          <button
            type="button"
            className={activeSection === 'documents' ? 'active' : ''}
            onClick={() => handleSectionChange('documents')}
          >
            <FileText />
            <span>Documentos</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <button
            type="button"
            onClick={onLogout}
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="dashboard-content">
        <header className="mobile-header">
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={toggleMenu}
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>
          <h1>{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h1>
        </header>

        <Suspense fallback={<LoadingScreen text="Cargando sección..." />}>
          {activeSection === 'querybot'
            ? React.createElement(componentMap[activeSection], { userId: user.id })
            : React.createElement(componentMap[activeSection], { user })}
        </Suspense>
      </main>
    </div>
  );
}

export default Dashboard;