import React, { useState, useEffect } from 'react';
import supabase from '../services/supabase';
import '../styles/JobSearch.css';

function JobSearch({ user }) {
  // Extraemos el id del usuario
  const userId = user.id;

  // Estados
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [matchingJobs, setMatchingJobs] = useState([]);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [expandedRequirements, setExpandedRequirements] = useState({});
  const [userProfile, setUserProfile] = useState(null);

  // Función para alternar tema oscuro/claro
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.setAttribute('data-theme', isDarkMode ? 'light' : 'dark');
  };

  // Función para alternar visualización de requisitos
  const toggleRequirements = (jobId) => {
    setExpandedRequirements(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  // Calculador de porcentaje de coincidencia - simulado
  const calculateMatchPercentage = (job, userProfile) => {
    if (!userProfile) return 70;
    
    // Simular porcentaje basado en comparaciones
    let score = 0;
    let totalPoints = 0;
    
    // Licencia
    if (userProfile.license_type && job.min_requirements) {
      let minReq = typeof job.min_requirements === 'string' 
        ? JSON.parse(job.min_requirements) 
        : job.min_requirements;
      
      if (minReq["License req."] && userProfile.license_type.includes(minReq["License req."])) {
        score += 30;
      }
      totalPoints += 30;
      
      // Horas de vuelo
      if (minReq["Total time"]) {
        const requiredHours = parseInt(minReq["Total time"].replace(/\D/g, '')) || 0;
        const userHours = userProfile.flight_hours || 0;
        
        if (userHours >= requiredHours) {
          score += 40;
        } else if (userHours >= requiredHours * 0.8) {
          score += 20;
        }
        totalPoints += 40;
      }
      
      // Type rating
      if (minReq["Type rating"] === "Required" && job.aircraft) {
        if (userProfile.aircraft_ratings && userProfile.aircraft_ratings.includes(job.aircraft)) {
          score += 30;
        }
        totalPoints += 30;
      }
    }
    
    // Asegurar que haya un mínimo de puntos para evaluar
    if (totalPoints === 0) {
      return 70; // Valor por defecto
    }
    
    // Calcular porcentaje final
    const percentage = Math.round((score / totalPoints) * 100);
    return Math.min(100, Math.max(60, percentage));
  };

  // Función para formatear requisitos para visualización
  const formatRequirements = (reqObj) => {
    if (!reqObj) return [];
    
    let formatted = [];
    
    if (typeof reqObj === 'string') {
      try {
        reqObj = JSON.parse(reqObj);
      } catch {
        return [{ label: 'Requisitos', value: reqObj }];
      }
    }
    
    Object.entries(reqObj).forEach(([key, value]) => {
      formatted.push({
        label: key,
        value: value
      });
    });
    
    return formatted;
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    // Función para parsear licencias
    const parseLicenses = (licenseStr) => {
      if (!licenseStr || licenseStr.trim() === "") return new Set();
      
      const tokens = licenseStr.split(',')
        .map(tok => tok.trim().toUpperCase())
        .filter(tok => tok);
        
      const expanded = new Set();
      tokens.forEach(tok => {
        if (tok.includes("ATPL")) {
          expanded.add("ATPL");
          expanded.add("CPL");
          expanded.add("IR");
          expanded.add("ME");
        } else if (tok.includes("CPL")) {
          expanded.add("CPL");
        } else if (tok.includes("PPL")) {
          expanded.add("PPL");
        } else if (tok.includes("IR")) {
          expanded.add("IR");
        } else if (tok.includes("ME")) {
          expanded.add("ME");
        }
      });
      
      return expanded;
    };
    
    // Función para parsear ratings
    const parseRatings = (ratingStr) => {
      if (!ratingStr || ratingStr.trim() === "") return new Set();
      
      return new Set(
        ratingStr.split(',')
          .map(token => token.trim().toUpperCase())
          .filter(token => token)
      );
    };

    // Filtrar trabajos según el perfil del usuario
    const filterJobsByUserProfile = (jobs, userProfile) => {
      if (!userProfile) return [];
      
      return jobs.filter(job => {
        const userLicenseStr = userProfile.license_type || "";
        const userLicenses = userLicenseStr.trim() === "" ? null : parseLicenses(userLicenseStr);
        
        const userFlightHours = userProfile.flight_hours || -1;
        
        const userPosition = (userProfile.position_type || "").trim();
        const userPositionFilter = userPosition === "" ? null : userPosition;
        
        const userRatingsStr = userProfile.aircraft_ratings || "";
        const userRatings = userRatingsStr.trim() === "" ? null : parseRatings(userRatingsStr);
        
        let minReq = job.min_requirements || {};
        if (typeof minReq === 'string') {
          try {
            minReq = JSON.parse(minReq);
          } catch {
            minReq = {};
          }
        }
        
        // Comparación de Licencia
        const jobLicenseReqStr = minReq["License req."] || "";
        const jobLicenses = parseLicenses(jobLicenseReqStr);
        
        let licenseMatch = true;
        if (userLicenses !== null) {
          licenseMatch = jobLicenses.size === 0 || Array.from(jobLicenses).every(license => userLicenses.has(license));
        }
        
        // Comparación de Horas de Vuelo
        let jobTotalHours = 0;
        const jobTotalTimeStr = (minReq["Total time"] || "0 hours").toLowerCase();
        if (jobTotalTimeStr.includes("hours")) {
          try {
            jobTotalHours = parseInt(jobTotalTimeStr.replace("hours", "").trim());
          } catch {
            jobTotalHours = 0;
          }
        }
        const hoursMatch = userFlightHours === -1 || userFlightHours >= jobTotalHours;
        
        // Comparación de Posición
        const jobPosition = (job.position_type || "").trim();
        const positionMatch = userPositionFilter === null || jobPosition === "" || userPositionFilter === jobPosition;
        
        // Comparación de Type Rating
        const jobTypeRatingReq = (minReq["Type rating"] || "").trim();
        let typeRatingMatch = true;
        if (jobTypeRatingReq && jobTypeRatingReq === "Required") {
          const requiredAircraft = (job.aircraft || "").trim().toUpperCase();
          if (userRatings !== null) {
            typeRatingMatch = userRatings.has(requiredAircraft);
          }
        }
        
        return licenseMatch && hoursMatch && positionMatch && typeRatingMatch;
      });
    };

    // Cargar datos desde la API
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        // Obtener perfil del usuario
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', userId);
        
        if (userError) throw userError;
        if (!userData || userData.length !== 1) {
          throw new Error("No se encontró un perfil único para el usuario");
        }
        
        const userProfileData = userData[0];
        setUserProfile(userProfileData);
        
        // Obtener ofertas de trabajo
        const { data: jobsData, error: jobsError } = await supabase
          .from('job_postings')
          .select('*');
        
        if (jobsError) throw jobsError;
        
        // Procesar trabajos con ID único para expansión de requisitos
        const jobsWithIds = (jobsData || []).map(job => ({
          ...job,
          uniqueId: `job-${job.id || Math.random().toString(36).substring(2, 9)}`
        }));
        
        setJobs(jobsWithIds);
        
        // Filtrar trabajos coincidentes
        const filtered = filterJobsByUserProfile(jobsWithIds, userProfileData);
        setMatchingJobs(filtered);
        
      } catch (error) {
        console.error('Error al obtener datos:', error.message);
        setError(`No pudimos cargar las ofertas de trabajo: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  // Renderizar componente de error
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
        <div className="loading-animation">
          <div className="loading-circle loading-circle-1"></div>
          <div className="loading-circle loading-circle-2"></div>
          <div className="loading-circle loading-circle-3"></div>
        </div>
        <p className="loading-text">Buscando ofertas de trabajo que coincidan con tu perfil...</p>
      </div>
    );
  };

  // Renderizar tarjetas de trabajo
  const renderJobs = () => {
    return (
      <div className="jobs-list">
        {matchingJobs.map((job, index) => {
          // Procesar requisitos para visualización
          const requirements = formatRequirements(job.min_requirements);
          const matchPercentage = calculateMatchPercentage(job, userProfile);
          const isExpanded = expandedRequirements[job.uniqueId] || false;
          
          return (
            <div key={job.uniqueId || index} className="job-card">
              <div className="job-header">
                <h3 className="job-title">{job.title || "Oferta sin título"}</h3>
                <div className="job-subtitle">
                  <span className="job-airline">{job.airline || "Aerolínea no especificada"}</span>
                  <span className="job-match">
                    <span>✓</span> {matchPercentage}% coincidencia
                  </span>
                </div>
              </div>
              
              <div className="job-details">
                <div className="detail-item">
                  <span className="detail-label">Ubicación</span>
                  <span className="detail-value">
                    <span className="detail-icon">📍</span>
                    {job.location || "No especificada"}
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Aeronave</span>
                  <span className="detail-value">
                    <span className="detail-icon">✈️</span>
                    {job.aircraft || "No especificada"}
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Posición</span>
                  <span className="detail-value">
                    <span className="detail-icon">👨‍✈️</span>
                    {job.position_type || "No especificada"}
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Fecha</span>
                  <span className="detail-value">
                    <span className="detail-icon">📅</span>
                    {job.post_date ? new Date(job.post_date).toLocaleDateString() : "Reciente"}
                  </span>
                </div>
              </div>
              
              {requirements.length > 0 && (
                <div className="requirements-section">
                  <div 
                    className="requirements-header" 
                    onClick={() => toggleRequirements(job.uniqueId)}
                  >
                    <h4 className="requirements-title">Requisitos mínimos</h4>
                    <span className={`toggle-icon ${isExpanded ? 'open' : ''}`}>▼</span>
                  </div>
                  
                  <div className={`requirements-content ${isExpanded ? 'open' : ''}`}>
                    <ul className="requirements-list">
                      {requirements.map((req, idx) => (
                        <li key={idx} className="requirement-item">
                          <span className="requirement-label">{req.label}</span>
                          <span className="requirement-value">{req.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="job-actions">
                {job.apply_link ? (
                  <a 
                    href={job.apply_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="apply-button"
                  >
                    <span>Aplicar</span>
                    <span>→</span>
                  </a>
                ) : (
                  <button className="apply-button">
                    <span>Aplicar</span>
                    <span>→</span>
                  </button>
                )}
                
                <div className="action-buttons">
                  <button className="action-btn" title="Guardar oferta">
                    🔖
                  </button>
                  <button className="action-btn" title="Compartir oferta">
                    🔗
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Renderizar mensaje de no resultados
  const renderNoJobs = () => {
    return (
      <div className="no-jobs">
        <div className="no-jobs-icon">🔍</div>
        <div>
          <h3 className="no-jobs-title">Sin coincidencias disponibles</h3>
          <p className="no-jobs-message">
            No encontramos ofertas de trabajo que coincidan actualmente con tu perfil. 
            Actualiza tus calificaciones o regresa más tarde para nuevas oportunidades.
          </p>
        </div>
        <button className="update-profile-btn">Actualizar mi perfil</button>
      </div>
    );
  };

  return (
    <div className="jobs-container" data-theme={isDarkMode ? 'dark' : 'light'}>
      <div className="jobs-header">
        <div>
          <h1 className="jobs-title">Ofertas de Trabajo</h1>
          <p className="jobs-subtitle">Explora oportunidades laborales que coinciden con tu perfil</p>
        </div>
        <div className="header-controls">
          <button 
            className="header-control-btn"
            onClick={toggleDarkMode}
            title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      
      <div className="jobs-content">
        {renderError()}
        
        {loading ? (
          renderLoading()
        ) : (
          <>
            <div className="jobs-summary">
              <span className="summary-icon">✨</span>
              <p className="summary-text">
                Se encontraron <span className="highlight">{matchingJobs.length}</span> ofertas de trabajo 
                que coinciden con tu perfil (de un total de {jobs.length} disponibles).
              </p>
            </div>
            
            {matchingJobs.length > 0 ? renderJobs() : renderNoJobs()}
          </>
        )}
      </div>
    </div>
  );
}

export default JobSearch;