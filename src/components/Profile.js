import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Globe, 
  Plane, 
  Award, 
  User, 
  Edit3, 
  X, 
  AlertTriangle,
  CheckCircle,
  PieChart,
  Briefcase
} from 'lucide-react';
import supabase from '../services/supabase';
import '../styles/Profile.css';

// Definición de constantes para opciones de selección
const LICENSE_TYPES = [
  { value: '', label: 'Seleccionar...' },
  { value: 'ATPL', label: 'ATPL - Airline Transport Pilot License' },
  { value: 'CPL', label: 'CPL - Commercial Pilot License' },
  { value: 'PPL', label: 'PPL - Private Pilot License' },
  { value: 'MPL', label: 'MPL - Multi-crew Pilot License' },
  { value: 'SPL', label: 'SPL - Sport Pilot License' },
  { value: 'RPL', label: 'RPL - Recreational Pilot License' },
  { value: 'Otro', label: 'Otro' }
];

const POSITION_TYPES = [
  { value: '', label: 'Seleccionar...' },
  { value: 'Captain', label: 'Captain' },
  { value: 'First Officer', label: 'First Officer' },
  { value: 'Second Officer', label: 'Second Officer' },
  { value: 'Flight Engineer', label: 'Flight Engineer' },
  { value: 'Cadet', label: 'Cadet' },
  { value: 'Instructor', label: 'Instructor' },
  { value: 'Otro', label: 'Otro' }
];

const COMMON_AIRCRAFT_MODELS = [
  'A320', 'A330', 'A340', 'A350', 'A380',
  'B737', 'B747', 'B757', 'B767', 'B777', 'B787',
  'CRJ', 'E145', 'E175', 'E190', 'ATR42', 'ATR72',
  'C152', 'C172', 'C182', 'C208', 'PA28', 'PA44',
  'BE20', 'BE58', 'DA40', 'DA42'
];

const POPULAR_COUNTRIES = [
  "Argentina", "Australia", "Brasil", "Canadá", "Chile", "China", 
  "Colombia", "España", "Estados Unidos", "Francia", "Italia", "Japón", 
  "México", "Nueva Zelanda", "Perú", "Reino Unido", "Rusia", "Sudáfrica"
];

function Profile({ user }) {
  // Estados principales
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAddRatingModal, setShowAddRatingModal] = useState(false);
  const [newRating, setNewRating] = useState('');
  const [customRating, setCustomRating] = useState('');
  const [jobMatches, setJobMatches] = useState([]);
  const [recentFlights, setRecentFlights] = useState([]);
  
  // Métricas calculadas del logbook
  // eslint-disable-next-line no-unused-vars
  const [totalFlightMetrics, setTotalFlightMetrics] = useState({
    total: 0,
    pic: 0,
    sic: 0,
    night: 0,
    instrument: 0,
    landings: 0
  });
    
  // Refs para los elementos que necesitan foco
  const newRatingInputRef = useRef(null);
  
  // Formdata inicial
  const initialFormData = {
    total_hours: '',
    pic_hours: '',
    sic_hours: '',
    night_hours: '',
    instrument_hours: '',
    landings: '',
    country: '',
    aircraft_ratings: '',
    license_type: '',
    position_type: '',
    medical_class: '',
    medical_expiry: '',
    english_level: '',
    additional_info: ''
  };
  
  // Estado del formulario
  const [formData, setFormData] = useState(initialFormData);

  // Efecto para cargar datos del perfil
  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        
        // Procesar datos para el nuevo formato
        const profileData = {
          ...data,
          total_hours: data.flight_hours || 0,
          pic_hours: data.pic_hours || 0,
          sic_hours: data.sic_hours || 0,
          night_hours: data.night_hours || 0,
          instrument_hours: data.instrument_hours || 0,
          landings: data.landings || 0,
          aircraft_ratings: data.aircraft_ratings || '',
          country: data.country || '',
          license_type: data.license_type || '',
          position_type: data.position_type || '',
          medical_class: data.medical_class || '',
          medical_expiry: data.medical_expiry || '',
          english_level: data.english_level || '',
          additional_info: data.additional_info || ''
        };
        
        setProfile(profileData);
        
        // Inicializar formData con los datos del perfil
        setFormData({
          total_hours: profileData.total_hours.toString() || '',
          pic_hours: profileData.pic_hours.toString() || '',
          sic_hours: profileData.sic_hours.toString() || '',
          night_hours: profileData.night_hours.toString() || '',
          instrument_hours: profileData.instrument_hours.toString() || '',
          landings: profileData.landings.toString() || '',
          country: profileData.country || '',
          aircraft_ratings: profileData.aircraft_ratings || '',
          license_type: profileData.license_type || '',
          position_type: profileData.position_type || '',
          medical_class: profileData.medical_class || '',
          medical_expiry: profileData.medical_expiry || '',
          english_level: profileData.english_level || '',
          additional_info: profileData.additional_info || ''
        });
        
        // Cargar trabajos relacionados
        fetchMatchingJobs(profileData);
        
        // Cargar vuelos recientes
        fetchRecentFlights();
        
        // Calcular métricas totales de vuelos
        calculateTotalFlightMetrics();
      } catch (error) {
        console.error('Error al obtener el perfil:', error.message);
        setError('No pudimos cargar tu perfil. Por favor, intenta de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Función para cargar trabajos que coinciden con el perfil
  const fetchMatchingJobs = async (profileData) => {
    try {
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .limit(100);
      
      if (error) throw error;
      
      // Filtrado simple para encontrar coincidencias
      // En un caso real, esto se haría en el backend
      const matches = data.filter(job => {
        // Verificar coincidencia de posición
        const positionMatch = !profileData.position_type || 
          job.position_type === profileData.position_type;
        
        // Verificar coincidencia de horas mínimas
        let hoursMatch = true;
        if (job.min_requirements) {
          const minReq = typeof job.min_requirements === 'string' ? 
            JSON.parse(job.min_requirements) : job.min_requirements;
          
          if (minReq["Total time"]) {
            const reqHours = parseInt(minReq["Total time"].replace(/\D/g, '')) || 0;
            hoursMatch = profileData.total_hours >= reqHours;
          }
        }
        
        // Verificar Type Ratings requeridos
        let typeRatingMatch = true;

        if (job.min_requirements) {
          const minReq = typeof job.min_requirements === 'string' ? 
            JSON.parse(job.min_requirements) : job.min_requirements;
          
          // Obtener el valor de Type rating (puede ser un objeto o un string)
          const typeRatingInfo = minReq["Type rating"];
          
          // Verificar si Type Rating es requerido (puede estar en diferentes formatos)
          const isTypeRatingRequired = 
            // Si es un objeto con propiedad "required"
            (typeof typeRatingInfo === 'object' && typeRatingInfo.required) ||
            // Si es un string que indica "Required"
            typeRatingInfo === "Required";
            
          if (isTypeRatingRequired) {
            // Obtener habilitaciones del usuario
            const userRatings = profileData.aircraft_ratings ? 
              profileData.aircraft_ratings.split(',').map(r => r.trim().toUpperCase()) : [];
            
            // Verificar si el usuario tiene la habilitación para esta aeronave
            if (userRatings.length > 0) {
              const requiredAircraft = (job.aircraft || "").trim().toUpperCase();
              if (requiredAircraft && !userRatings.includes(requiredAircraft)) {
                typeRatingMatch = false;
                console.log(`No coincide habilitación: Usuario tiene ${userRatings.join(',')} pero se requiere ${requiredAircraft}`);
              }
            }
          }
        }
        
        return positionMatch && hoursMatch && typeRatingMatch;
      });
      
      setJobMatches(matches.slice(0, 2)); // Mostrar máximo 3 matches

    } catch (error) {
      console.error('Error al cargar trabajos coincidentes:', error);
    }
  };
  
  // Función para cargar vuelos recientes
  const fetchRecentFlights = async () => {
    try {
      const { data, error } = await supabase
        .from('flight_logs_custom')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_timestamp', { ascending: false })
        .limit(2);
      
      if (error) throw error;
      
      // Procesar vuelos para mostrar
      const processedFlights = data.map(flight => {
        let flightData = {};
        try {
          flightData = JSON.parse(flight.entry_data);
        } catch (e) {
          console.error('Error parsing flight data:', e);
        }
        
        return {
          id: flight.id,
          date: flightData.Date || 'Desconocido',
          aircraft: flightData['Aircraft Type'] || flightData.Aircraft || 'N/A',
          route: flightData.Route || `${flightData['Route - From'] || ''} - ${flightData['Route - To'] || ''}`,
          duration: flightData['Total Duration of Flight'] || flightData['Total Duration'] || 'N/A'
        };
      });
      
      setRecentFlights(processedFlights);
    } catch (error) {
      console.error('Error al cargar vuelos recientes:', error);
    }
  };
  
  // Función para calcular métricas totales de vuelos
  const calculateTotalFlightMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('flight_logs_custom')
        .select('entry_data')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Calcular totales
      let metrics = {
        total: 0,
        pic: 0,
        sic: 0,
        night: 0,
        instrument: 0,
        landings: 0
      };
      
      data.forEach(entry => {
        try {
          const flightData = JSON.parse(entry.entry_data);
          
          // Sumar horas totales
          const duration = parseFloat(flightData['Total Duration of Flight'] || 
                                     flightData['Total Duration'] || 
                                     flightData['Hours'] || 0);
          
          if (!isNaN(duration)) {
            metrics.total += duration;
            
            // Asumiendo que pueden existir estos campos
            if (flightData['PIC'] === 'Yes' || flightData['Type of Piloting Time'] === 'PIC') {
              metrics.pic += duration;
            } else if (flightData['SIC'] === 'Yes' || flightData['Type of Piloting Time'] === 'SIC') {
              metrics.sic += duration;
            }
            
            // Horas nocturnas e instrumentos (si existen)
            if (flightData['Night'] === 'Yes' || flightData['Conditions of Flight'] === 'Night') {
              metrics.night += duration;
            }
            
            if (flightData['Instrument'] === 'Yes' || flightData['Conditions of Flight'] === 'IFR') {
              metrics.instrument += duration;
            }
          }
          
          // Sumar aterrizajes
          const landings = parseInt(flightData['Nr Ldg'] || flightData['Landings'] || 0);
          if (!isNaN(landings)) {
            metrics.landings += landings;
          }
        } catch (e) {
          console.error('Error parsing flight metrics:', e);
        }
      });
      
      setTotalFlightMetrics(metrics);
    } catch (error) {
      console.error('Error al calcular métricas de vuelo:', error);
    }
  };

  // Función para manejar la apertura del modal de agregar habilitación
  const handleOpenAddRating = () => {
    setShowAddRatingModal(true);
    // Enfocar el input después de que se muestre el modal
    setTimeout(() => {
      if (newRatingInputRef.current) {
        newRatingInputRef.current.focus();
      }
    }, 100);
  };
  
  // Función para añadir una nueva habilitación
  const handleAddRating = () => {
    let ratingToAdd = newRating;
    
    // Si se seleccionó "Otro", usar el valor del input personalizado
    if (newRating === 'custom' && customRating.trim()) {
      ratingToAdd = customRating.trim();
    } else if (newRating === 'custom' && !customRating.trim()) {
      return; // No agregar si es custom pero está vacío
    }
    
    if (!ratingToAdd) return;
    
    // Obtener las habilitaciones actuales
    const currentRatings = formData.aircraft_ratings
      .split(',')
      .map(r => r.trim())
      .filter(r => r);
    
    // Agregar la nueva habilitación si no existe
    if (!currentRatings.includes(ratingToAdd)) {
      const updatedRatings = [...currentRatings, ratingToAdd].join(', ');
      
      setFormData({
        ...formData,
        aircraft_ratings: updatedRatings
      });
    }
    
    // Limpiar y cerrar el modal
    setNewRating('');
    setCustomRating('');
    setShowAddRatingModal(false);
  };
  
  // Función para eliminar una habilitación
  const handleRemoveRating = (ratingToRemove) => {
    const currentRatings = formData.aircraft_ratings
      .split(',')
      .map(r => r.trim())
      .filter(r => r && r !== ratingToRemove);
    
    setFormData({
      ...formData,
      aircraft_ratings: currentRatings.join(', ')
    });
  };

  // Manejador de cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validación especial para campos numéricos
    if (['total_hours', 'pic_hours', 'sic_hours', 'night_hours', 'instrument_hours', 'landings'].includes(name)) {
      // Permitir solo números y decimales
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Manejador para iniciar edición de una sección específica
  const handleEditSection = (section) => {
    setEditSection(section);
    setEditing(true);
  };
  
  // Manejador para cancelar la edición
  const handleCancelEdit = () => {
    // Restaurar datos del formulario desde el perfil
    setFormData({
      total_hours: profile.total_hours?.toString() || '',
      pic_hours: profile.pic_hours?.toString() || '',
      sic_hours: profile.sic_hours?.toString() || '',
      night_hours: profile.night_hours?.toString() || '',
      instrument_hours: profile.instrument_hours?.toString() || '',
      landings: profile.landings?.toString() || '',
      country: profile.country || '',
      aircraft_ratings: profile.aircraft_ratings || '',
      license_type: profile.license_type || '',
      position_type: profile.position_type || '',
      medical_class: profile.medical_class || '',
      medical_expiry: profile.medical_expiry || '',
      english_level: profile.english_level || '',
      additional_info: profile.additional_info || ''
    });
    
    setEditSection(null);
    setEditing(false);
    setError(null);
  };

  // Manejador de envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Preparar datos para actualización
      const updateData = {};
      
      // Mapear campos según la sección que se está editando
      if (editSection === 'hours') {
        updateData.flight_hours = parseFloat(formData.total_hours) || 0;
        updateData.pic_hours = parseFloat(formData.pic_hours) || 0;
        updateData.sic_hours = parseFloat(formData.sic_hours) || 0;
        updateData.night_hours = parseFloat(formData.night_hours) || 0;
        updateData.instrument_hours = parseFloat(formData.instrument_hours) || 0;
        updateData.landings = parseInt(formData.landings) || 0;
      } else if (editSection === 'license') {
        updateData.license_type = formData.license_type;
        updateData.medical_class = formData.medical_class;
        updateData.medical_expiry = formData.medical_expiry;
        updateData.english_level = formData.english_level;
      } else if (editSection === 'position') {
        updateData.position_type = formData.position_type;
        updateData.country = formData.country;
      } else if (editSection === 'ratings') {
        updateData.aircraft_ratings = formData.aircraft_ratings;
      } else if (editSection === 'additional') {
        updateData.additional_info = formData.additional_info;
      }
      
      // Actualizar en Supabase
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Actualizar estado local
      setProfile(prev => ({
        ...prev,
        ...updateData
      }));
      
      setSuccess('¡Información actualizada con éxito!');
      setEditSection(null);
      setEditing(false);
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error al actualizar la información:', error.message);
      setError(`Error al actualizar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Componente de carga
  if (loading) {
    return (
      <div className="profile-container">
        <h2 className="section-title">Mi Perfil</h2>
        <div className="profile-loading">
          <div className="profile-loading-spinner"></div>
          <p>Cargando tu información profesional...</p>
        </div>
      </div>
    );
  }

  // Renderizado principal
  return (
    <div className="profile-container">
      <div className="profile-header-bar">
        <h2 className="profile-title">Mi Perfil de Piloto</h2>
      </div>
      
      {/* Alertas y mensajes */}
      <AnimatePresence>
        {error && (
          <motion.div 
            className="profile-alert error"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AlertTriangle size={20} />
            <p>{error}</p>
            <button onClick={() => setError(null)}><X size={16} /></button>
          </motion.div>
        )}
        
        {success && (
          <motion.div 
            className="profile-alert success"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <CheckCircle size={20} />
            <p>{success}</p>
            <button onClick={() => setSuccess(null)}><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="profile-content">
        <div className="profile-main-grid">
          {/* Sección de Información Personal */}
          <div className="profile-card profile-personal">
            <div className="profile-card-header">
              <div className="profile-personal-avatar">
                {profile?.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div className="profile-personal-info">
                <h3>{profile?.name || user.email?.split('@')[0] || 'Piloto Profesional'}</h3>
                <p className="profile-email">{user.email}</p>
                <div className="profile-tags">
                  {profile?.license_type && (
                    <span className="profile-tag license">
                      {profile.license_type}
                    </span>
                  )}
                  {profile?.position_type && (
                    <span className="profile-tag position">
                      {profile.position_type}
                    </span>
                  )}
                  {profile?.country && (
                    <span className="profile-tag country">
                      <Globe size={14} />
                      {profile.country}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Sección de Horas de Vuelo */}
          <div className="profile-card profile-hours">
            <div className="profile-card-header">
              <h3><Clock size={18} /> Horas de Vuelo</h3>
              {!editing && (
                <button 
                  className="profile-card-edit-btn"
                  onClick={() => handleEditSection('hours')}
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
            
            <AnimatePresence mode="wait">
              {editing && editSection === 'hours' ? (
                <motion.form 
                  key="hours-form"
                  className="profile-edit-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                >
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label htmlFor="total_hours">Horas Totales</label>
                      <input
                        type="text"
                        id="total_hours"
                        name="total_hours"
                        value={formData.total_hours}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="pic_hours">Horas PIC</label>
                      <input
                        type="text"
                        id="pic_hours"
                        name="pic_hours"
                        value={formData.pic_hours}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="sic_hours">Horas SIC</label>
                      <input
                        type="text"
                        id="sic_hours"
                        name="sic_hours"
                        value={formData.sic_hours}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="night_hours">Horas Nocturnas</label>
                      <input
                        type="text"
                        id="night_hours"
                        name="night_hours"
                        value={formData.night_hours}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="instrument_hours">Horas Instrumentos</label>
                      <input
                        type="text"
                        id="instrument_hours"
                        name="instrument_hours"
                        value={formData.instrument_hours}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="landings">Aterrizajes</label>
                      <input
                        type="text"
                        id="landings"
                        name="landings"
                        value={formData.landings}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button
                      type="button"
                      className="form-cancel-btn"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="form-submit-btn"
                      disabled={saving}
                    >
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div 
                  key="hours-display"
                  className="profile-hours-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="hours-stat hours-total">
                    <div className="hours-value">{profile?.total_hours || 0}</div>
                    <div className="hours-label">Total</div>
                  </div>
                  
                  <div className="hours-stat">
                    <div className="hours-value">{profile?.pic_hours || 0}</div>
                    <div className="hours-label">PIC</div>
                  </div>
                  
                  <div className="hours-stat">
                    <div className="hours-value">{profile?.sic_hours || 0}</div>
                    <div className="hours-label">SIC</div>
                  </div>
                  
                  <div className="hours-stat">
                    <div className="hours-value">{profile?.night_hours || 0}</div>
                    <div className="hours-label">Nocturno</div>
                  </div>
                  
                  <div className="hours-stat">
                    <div className="hours-value">{profile?.instrument_hours || 0}</div>
                    <div className="hours-label">Instrumentos</div>
                  </div>
                  
                  <div className="hours-stat">
                    <div className="hours-value">{profile?.landings || 0}</div>
                    <div className="hours-label">Aterrizajes</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Sección de Licencia */}
          <div className="profile-card profile-license">
            <div className="profile-card-header">
              <h3><Award size={18} /> Licencia & Certificaciones</h3>
              {!editing && (
                <button 
                  className="profile-card-edit-btn"
                  onClick={() => handleEditSection('license')}
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
            
            <AnimatePresence mode="wait">
              {editing && editSection === 'license' ? (
                <motion.form 
                  key="license-form"
                  className="profile-edit-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                >
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label htmlFor="license_type">Tipo de Licencia</label>
                      <select
                        id="license_type"
                        name="license_type"
                        value={formData.license_type}
                        onChange={handleChange}
                      >
                        {LICENSE_TYPES.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="medical_class">Clase Médica</label>
                      <select
                        id="medical_class"
                        name="medical_class"
                        value={formData.medical_class}
                        onChange={handleChange}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Class 1">Class 1</option>
                        <option value="Class 2">Class 2</option>
                        <option value="Class 3">Class 3</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="medical_expiry">Expiración Médica</label>
                      <input
                        type="date"
                        id="medical_expiry"
                        name="medical_expiry"
                        value={formData.medical_expiry}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="english_level">Nivel de Inglés</label>
                      <select
                        id="english_level"
                        name="english_level"
                        value={formData.english_level}
                        onChange={handleChange}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="ICAO Level 3">ICAO Level 3</option>
                        <option value="ICAO Level 4">ICAO Level 4</option>
                        <option value="ICAO Level 5">ICAO Level 5</option>
                        <option value="ICAO Level 6">ICAO Level 6</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button
                      type="button"
                      className="form-cancel-btn"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="form-submit-btn"
                      disabled={saving}
                    >
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div 
                  key="license-display"
                  className="profile-license-info"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="license-box">
                    <div className="license-type">
                      <span className="license-label">Tipo de Licencia:</span>
                      <span className="license-value">
                        {profile?.license_type || 'No especificado'}
                      </span>
                    </div>
                    
                    <div className="license-details">
                      <div className="license-detail">
                        <span className="license-label">Clase Médica:</span>
                        <span className="license-value">
                          {profile?.medical_class || 'No especificado'}
                        </span>
                      </div>
                      
                      <div className="license-detail">
                        <span className="license-label">Expiración Médica:</span>
                        <span className="license-value">
                          {profile?.medical_expiry ? new Date(profile.medical_expiry).toLocaleDateString() : 'No especificado'}
                        </span>
                      </div>
                      
                      <div className="license-detail">
                        <span className="license-label">Nivel de Inglés:</span>
                        <span className="license-value">
                          {profile?.english_level || 'No especificado'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Sección de Posición */}
          <div className="profile-card profile-position">
            <div className="profile-card-header">
              <h3><User size={18} /> Posición & Ubicación</h3>
              {!editing && (
                <button 
                  className="profile-card-edit-btn"
                  onClick={() => handleEditSection('position')}
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
            
            <AnimatePresence mode="wait">
              {editing && editSection === 'position' ? (
                <motion.form 
                  key="position-form"
                  className="profile-edit-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                >
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label htmlFor="position_type">Posición</label>
                      <select
                        id="position_type"
                        name="position_type"
                        value={formData.position_type}
                        onChange={handleChange}
                      >
                        {POSITION_TYPES.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="country">País</label>
                      <select
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                      >
                        <option value="">Seleccionar...</option>
                        {POPULAR_COUNTRIES.map(country => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                        <option value="other">Otro país...</option>
                      </select>
                      
                      {formData.country === 'other' && (
                        <input
                          type="text"
                          placeholder="Escribe el nombre del país"
                          className="custom-country-input"
                          value={formData.customCountry || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            customCountry: e.target.value
                          })}
                        />
                      )}
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button
                      type="button"
                      className="form-cancel-btn"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="form-submit-btn"
                      disabled={saving}
                    >
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div 
                  key="position-display"
                  className="profile-position-info"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="position-icon">
                    <User size={48} strokeWidth={1.5} />
                  </div>
                  <div className="position-details">
                    <div className="position-value">
                      {profile?.position_type || 'Posición no especificada'}
                    </div>
                    
                    <div className="position-location">
                      {profile?.country ? (
                        <>
                          <Globe size={18} />
                          <span>{profile.country}</span>
                        </>
                      ) : (
                        'País no especificado'
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Sección de Habilitaciones */}
          <div className="profile-card profile-ratings">
            <div className="profile-card-header">
              <h3><Plane size={18} /> Habilitaciones de Aeronaves</h3>
              {!editing && (
                <button 
                  className="profile-card-edit-btn"
                  onClick={() => handleEditSection('ratings')}
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
            
            <AnimatePresence mode="wait">
              {editing && editSection === 'ratings' ? (
                <motion.form 
                  key="ratings-form"
                  className="profile-edit-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                >
                  <div className="ratings-form-container">
                    <div className="ratings-list">
                      {formData.aircraft_ratings.split(',')
                        .map(rating => rating.trim())
                        .filter(rating => rating)
                        .map((rating, index) => (
                          <div className="rating-chip" key={`${rating}-${index}`}>
                            <span>{rating}</span>
                            <button 
                              type="button"
                              onClick={() => handleRemoveRating(rating)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                    </div>
                    
                    <button 
                      type="button"
                      className="add-rating-btn"
                      onClick={handleOpenAddRating}
                    >
                      + Añadir Habilitación
                    </button>
                  </div>
                  
                  <div className="form-actions">
                    <button
                      type="button"
                      className="form-cancel-btn"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="form-submit-btn"
                      disabled={saving}
                    >
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div 
                  key="ratings-display"
                  className="profile-ratings-display"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {profile?.aircraft_ratings ? (
                    <div className="ratings-grid">
                      {profile.aircraft_ratings.split(',')
                        .map(rating => rating.trim())
                        .filter(rating => rating)
                        .map((rating, index) => (
                          <motion.div 
                            className="rating-badge"
                            key={`${rating}-${index}`}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Plane size={16} />
                            <span>{rating}</span>
                          </motion.div>
                        ))}
                    </div>
                  ) : (
                    <div className="no-ratings-message">
                      <p>No hay habilitaciones de aeronaves especificadas.</p>
                      <button 
                        className="add-first-rating-btn"
                        onClick={() => handleEditSection('ratings')}
                      >
                        + Añadir tu primera habilitación
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Sección de Información Adicional */}
          <div className="profile-card profile-additional">
            <div className="profile-card-header">
              <h3>Información Adicional</h3>
              {!editing && (
                <button 
                  className="profile-card-edit-btn"
                  onClick={() => handleEditSection('additional')}
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
            
            <AnimatePresence mode="wait">
              {editing && editSection === 'additional' ? (
                <motion.form 
                  key="additional-form"
                  className="profile-edit-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                >
                  <div className="form-group">
                    <label htmlFor="additional_info">Información Adicional</label>
                    <textarea
                      id="additional_info"
                      name="additional_info"
                      value={formData.additional_info}
                      onChange={handleChange}
                      rows="4"
                      placeholder="Ingresa información adicional que quieras compartir sobre tu experiencia profesional..."
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button
                      type="button"
                      className="form-cancel-btn"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="form-submit-btn"
                      disabled={saving}
                    >
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div 
                  key="additional-display"
                  className="profile-additional-info"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {profile?.additional_info ? (
                    <p>{profile.additional_info}</p>
                  ) : (
                    <p className="no-info">No hay información adicional especificada.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Sección de Trabajos Recomendados */}
          <div className="profile-card profile-jobs">
            <div className="profile-card-header">
              <h3><Briefcase size={18} /> Trabajos Recomendados</h3>
              <button onClick={() => window.location.href='/jobs'} className="view-all-link">Ver todos</button>
            </div>
            
            <div className="profile-job-recommendations">
              {jobMatches.length > 0 ? (
                <div className="job-matches-list">
                  {jobMatches.map((job, index) => (
                    <div className="job-match-item" key={job.id || index}>
                      <div className="job-match-header">
                        <h4>{job.title || 'Posición no especificada'}</h4>
                        <span className="job-match-company">{job.airline || 'Empresa no especificada'}</span>
                      </div>
                      <div className="job-match-details">
                        <span className="job-match-location">
                          <Globe size={14} />
                          {job.location || 'Ubicación no especificada'}
                        </span>
                        <span className="job-match-aircraft">
                          <Plane size={14} />
                          {job.aircraft || 'Aeronave no especificada'}
                        </span>
                      </div>
                      <button 
                        onClick={() => window.location.assign('/jobs')} 
                        className="job-match-apply-btn"
                      >
                        Ver Detalles
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-jobs-message">
                  <p>No hay trabajos recomendados disponibles en este momento.</p>
                  <p>Completa tu perfil para recibir mejores recomendaciones.</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Sección de Vuelos Recientes */}
          <div className="profile-card profile-flights">
            <div className="profile-card-header">
              <h3><PieChart size={18} /> Últimos Vuelos</h3>
              <button onClick={() => window.location.href='/logbook'} className="view-all-link">Ver todos</button>
            </div>
            
            <div className="profile-recent-flights">
              {recentFlights.length > 0 ? (
                <div className="recent-flights-list">
                  {recentFlights.map((flight, index) => (
                    <div className="recent-flight-item" key={flight.id || index}>
                      <div className="recent-flight-date">{flight.date}</div>
                      <div className="recent-flight-details">
                        <div className="recent-flight-aircraft">{flight.aircraft}</div>
                        <div className="recent-flight-route">{flight.route}</div>
                      </div>
                      <div className="recent-flight-duration">{flight.duration}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-flights-message">
                  <p>No hay vuelos registrados en tu logbook.</p>
                  <button onClick={() => window.location.href='/logbook/add'} className="add-flight-link">Registrar un vuelo</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal para agregar habilitación */}
      <AnimatePresence>
        {showAddRatingModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddRatingModal(false)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Agregar Habilitación</h3>
                <button 
                  className="modal-close-btn"
                  onClick={() => setShowAddRatingModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="new-rating">Selecciona o ingresa una habilitación:</label>
                  <select
                    id="new-rating"
                    value={newRating}
                    onChange={(e) => setNewRating(e.target.value)}
                    ref={newRatingInputRef}
                  >
                    <option value="">Seleccionar...</option>
                    {COMMON_AIRCRAFT_MODELS.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                    <option value="custom">Otro...</option>
                  </select>
                  
                  {newRating === 'custom' && (
                    <input
                      type="text"
                      className="custom-rating-input"
                      placeholder="Ingresa el modelo de aeronave"
                      value={customRating}
                      onChange={(e) => setCustomRating(e.target.value)}
                    />
                  )}
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="modal-cancel-btn"
                  onClick={() => setShowAddRatingModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="modal-add-btn"
                  onClick={handleAddRating}
                  disabled={!newRating || (newRating === 'custom' && !customRating.trim())}
                >
                  Agregar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Profile;