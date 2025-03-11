import React, { useState, useEffect } from 'react';
import supabase from '../services/supabase';
import '../styles/InterviewPrep.css';

function InterviewPrep({ user }) {
  // Estados para gestionar datos y UI
  const [loading, setLoading] = useState(true);
  const [airlines, setAirlines] = useState([]);
  const [filteredAirlines, setFilteredAirlines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);
  const [selectedAirline, setSelectedAirline] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const pageSize = 8;

  // Cargar aerolíneas desde Supabase
  useEffect(() => {
    async function fetchAirlines() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('airlines')
          .select('*')
          .order('name');
          
        if (error) throw error;
        
        // Agregar propiedad aleatoria para el estado de contratación
        const airlinesWithHiringStatus = data.map(airline => ({
          ...airline,
          isHiring: Math.random() > 0.5,
          fleetSize: Math.floor(Math.random() * 200) + 5
        }));
        
        setAirlines(airlinesWithHiringStatus || []);
      } catch (error) {
        console.error('Error al obtener aerolíneas:', error.message);
        setError('No pudimos cargar la información de aerolíneas. Por favor, intenta de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAirlines();
  }, []);

  // Filtrar y paginar aerolíneas
  useEffect(() => {
    function filterAirlines() {
      let filtered = [...airlines];

      // Filtrar por término de búsqueda
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(airline =>
          airline.name.toLowerCase().includes(query) || 
          (airline.country && airline.country.toLowerCase().includes(query))
        );
      }

      // Calcular total de páginas
      const newTotalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      setTotalPages(newTotalPages);

      // Ajustar página actual si está fuera de rango
      if (page > newTotalPages) {
        setPage(1);
      }

      // Obtener resultados paginados
      const startIndex = (page - 1) * pageSize;
      const paginatedResults = filtered.slice(startIndex, startIndex + pageSize);
      setFilteredAirlines(paginatedResults);
    }
    
    filterAirlines();
  }, [searchQuery, airlines, page]);

  // Manejadores de eventos
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // Reinicia la paginación al buscar
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  };

  const openAirlineDetails = (airline) => {
    setSelectedAirline(airline);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.setAttribute('data-theme', isDarkMode ? 'light' : 'dark');
  };

  // Formatear flota para mostrar
  const formatFleet = (fleetText) => {
    if (!fleetText) return [];
    
    // Si fleetText es un string, intentamos dividirlo por comas
    if (typeof fleetText === 'string') {
      return fleetText.split(',').map(item => item.trim());
    }
    
    return [];
  };

  // Formatear proceso de contratación como pasos
  const formatHiringProcess = (processText) => {
    if (!processText) return [];
    
    if (typeof processText === 'string') {
      return processText
        .split('.')
        .filter(step => step.trim().length > 0)
        .map(step => step.trim());
    }
    
    return [];
  };

  // Renderizar mensajes de error
  const renderError = () => {
    if (!error) return null;
    
    return (
      <div className="error-message">
        <span className="error-icon">⚠️</span>
        <span>{error}</span>
      </div>
    );
  };

  // Renderizar indicador de carga
  const renderLoading = () => {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner-circle spinner-circle-1"></div>
          <div className="spinner-circle spinner-circle-2"></div>
          <div className="spinner-circle spinner-circle-3"></div>
        </div>
        <p className="loading-text">Cargando información de aerolíneas...</p>
      </div>
    );
  };

  // Renderizar mensaje de no resultados
  const renderNoResults = () => {
    return (
      <div className="no-results">
        <div className="no-results-icon">🔍</div>
        <h3 className="no-results-title">No encontramos resultados</h3>
        <p className="no-results-message">
          No hay aerolíneas que coincidan con tu búsqueda. 
          Intenta con otros términos o limpia el filtro para ver todas las opciones.
        </p>
      </div>
    );
  };

  // Renderizar tarjetas de aerolíneas
  const renderAirlines = () => {
    return (
      <div className="airlines-grid">
        {filteredAirlines.map((airline, index) => (
          <div key={index} className="airline-card" onClick={() => openAirlineDetails(airline)}>
            <div className="card-content">
              <h3 className="airline-name">{airline.name}</h3>
              {airline.country && (
                <p className="airline-location">
                  <span className="location-icon">📍</span>
                  <span>{airline.country}</span>
                </p>
              )}
              {airline.description && (
                <p className="airline-description">
                  {airline.description.length > 100 
                    ? airline.description.substring(0, 100) + '...'
                    : airline.description
                  }
                </p>
              )}
            </div>
            <div className="card-footer">
              <button className="view-details-btn">
                <span>Ver detalles</span>
                <span>→</span>
              </button>
              <div className="card-tag">
                {airline.isHiring ? '🟢 Contratando' : '⚪ Sin vacantes'}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Renderizar paginación
  const renderPagination = () => {
    return (
      <div className="pagination">
        <button 
          onClick={handlePrevPage} 
          disabled={page === 1}
          className="pagination-btn prev"
        >
          <span className="pagination-icon">←</span>
          <span>Anterior</span>
        </button>
        <span className="page-info">
          Página {page} de {totalPages}
        </span>
        <button 
          onClick={handleNextPage} 
          disabled={page >= totalPages}
          className="pagination-btn next"
        >
          <span>Siguiente</span>
          <span className="pagination-icon">→</span>
        </button>
      </div>
    );
  };

  // Renderizar modal de detalles
  const renderModal = () => {
    if (!showModal || !selectedAirline) return null;
    
    const fleetItems = formatFleet(selectedAirline.fleet);
    const hiringSteps = formatHiringProcess(selectedAirline.hiring_process);
    
    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">{selectedAirline.name}</h2>
            {selectedAirline.country && (
              <p className="modal-subtitle">{selectedAirline.country}</p>
            )}
            <button className="modal-close" onClick={closeModal}>×</button>
          </div>
          
          <div className="modal-body">
            {selectedAirline.description && (
              <div className="modal-section">
                <h3 className="section-title">
                  <span className="section-icon">✈️</span>
                  <span>Acerca de la aerolínea</span>
                </h3>
                <div className="section-content">{selectedAirline.description}</div>
              </div>
            )}
            
            {selectedAirline.interview_tips && (
              <div className="modal-section">
                <h3 className="section-title">
                  <span className="section-icon">💡</span>
                  <span>Tips para la entrevista</span>
                </h3>
                <div className="tips-content">
                  {selectedAirline.interview_tips}
                </div>
              </div>
            )}
            
            {fleetItems.length > 0 && (
              <div className="modal-section">
                <h3 className="section-title">
                  <span className="section-icon">🛩️</span>
                  <span>Flota</span>
                </h3>
                <div className="section-content">
                <p>La flota de {selectedAirline.name} incluye los siguientes modelos:</p>
                  <div className="fleet-list">
                    {fleetItems.map((item, idx) => (
                      <div key={idx} className="fleet-item">{item}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {hiringSteps.length > 0 && (
              <div className="modal-section">
                <h3 className="section-title">
                  <span className="section-icon">📝</span>
                  <span>Proceso de contratación</span>
                </h3>
                <div className="process-steps">
                  {hiringSteps.map((step, idx) => (
                    <div key={idx} className="process-step">
                      <p>{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="modal-section">
              <h3 className="section-title">
                <span className="section-icon">🔍</span>
                <span>Estado actual</span>
              </h3>
              <div className="section-content">
                <p>
                  <strong>Estado de contratación:</strong>{' '}
                  {selectedAirline.isHiring ? (
                    <span style={{ color: 'var(--secondary)' }}>
                      Actualmente contratando pilotos
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      Sin posiciones abiertas en este momento
                    </span>
                  )}
                </p>
                <p>
                  <strong>Tamaño de flota:</strong> Aproximadamente {selectedAirline.fleetSize} aeronaves
                </p>
                <p>
                  <strong>Última actualización:</strong> {new Date().toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="interview-prep-container" data-theme={isDarkMode ? 'dark' : 'light'}>
      <div className="interview-header">
        <div>
          <h1 className="header-title">Preparación para Entrevistas</h1>
          <p className="header-subtitle">Explora información sobre aerolíneas y sus procesos de contratación</p>
        </div>
        <div className="header-controls">
          <button 
            className="header-control-btn"
            onClick={toggleDarkMode}
            title={isDarkMode ? "Modo claro" : "Modo oscuro"}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      
      <div className="interview-content">
        {renderError()}
        
        <div className="search-container">
          <form onSubmit={handleSearch}>
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Buscar por nombre de aerolínea o país..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit">
                <span className="search-icon">🔍</span>
              </button>
            </div>
          </form>
        </div>
        
        {loading ? (
          renderLoading()
        ) : filteredAirlines.length > 0 ? (
          <>
            {renderAirlines()}
            {renderPagination()}
          </>
        ) : (
          renderNoResults()
        )}
      </div>
      
      {renderModal()}
    </div>
  );
}

export default InterviewPrep;