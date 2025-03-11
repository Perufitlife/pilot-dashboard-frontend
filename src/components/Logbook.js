import React, { useState, useEffect } from 'react';
import supabase from '../services/supabase';
import '../styles/Logbook.css';

function Logbook({ user }) {
  // Extraemos el ID del usuario del objeto "user"
  const userId = user.id;

  // Estados
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState('all');
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalHours: 0,
    flightTypes: {}
  });
  
  // Estados para el formulario de agregar entradas
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [isCustomizing, setIsCustomizing] = useState(false);
  
  // Definición de plantillas (igual que en backend)
  const TEMPLATES_CONFIG = {
    "Jeppesen": {
      "name": "Jeppesen Pilot Logbook (JS506048)",
      "fields": [
        "Date",
        "Aircraft Type",
        "Aircraft Ident",
        "Route - From",
        "Route - To",
        "Nr Inst. App.",
        "Remarks and Endorsements",
        "Nr T/O",
        "Nr Ldg",
        "Aircraft Category",
        "Conditions of Flight",
        "Flight Simulator",
        "Type of Piloting Time",
        "Total Duration of Flight"
      ]
    },
    "Simple": {
      "name": "Simple Logbook",
      "fields": [
        "Date",
        "Aircraft Type",
        "Aircraft Ident",
        "Route",
        "Total Duration"
      ]
    }
  };

  // Cambiar tema oscuro/claro
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.setAttribute('data-theme', isDarkMode ? 'light' : 'dark');
  };

  // Cargar entradas desde Supabase
  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Consultar directamente Supabase
      const { data, error } = await supabase
        .from('flight_logs_custom')
        .select('*')
        .eq('user_id', userId)
        .order('entry_timestamp', { ascending: false });
      
      if (error) throw error;
      
      // Guardamos las entradas obtenidas
      const entriesData = data || [];
      setEntries(entriesData);
      
      // Extraer templates únicos de las entradas
      const uniqueTemplates = [...new Set(entriesData.map(entry => entry.template))];
      setTemplates(uniqueTemplates);
      
      // Calcular estadísticas
      calculateStats(entriesData);
      
    } catch (error) {
      console.error('Error al obtener registros:', error.message);
      setError('No pudimos cargar tu logbook. Por favor, intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar entradas al montar el componente
  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  
  // Manejar selección de plantilla
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    
    // Inicializar campos del formulario según la plantilla seleccionada
    const initialFormData = {};
    template.fields.forEach(field => {
      initialFormData[field] = '';
    });
    
    // Establecer fecha actual por defecto para el campo Date
    if (initialFormData.hasOwnProperty('Date')) {
      const today = new Date().toISOString().split('T')[0];
      initialFormData['Date'] = today;
    }
    
    setFormData(initialFormData);
    setCustomFields(template.fields);
    setIsCustomizing(false);
  };
  
  // Manejar personalización de campos
  const handleCustomizeFields = () => {
    setIsCustomizing(true);
  };
  
  // Alternar selección de campo para personalización
  const toggleFieldSelection = (field) => {
    if (customFields.includes(field)) {
      setCustomFields(customFields.filter(f => f !== field));
      
      // Eliminar este campo del formData
      const newFormData = { ...formData };
      delete newFormData[field];
      setFormData(newFormData);
    } else {
      setCustomFields([...customFields, field]);
      
      // Añadir este campo de vuelta a formData
      setFormData(prevData => ({
        ...prevData,
        [field]: ''
      }));
    }
  };
  
  // Manejar cambios en los inputs
  const handleInputChange = (field, value) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };
  
  // Enviar el formulario para crear una nueva entrada
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedTemplate) {
      setError("Por favor, selecciona una plantilla primero");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Añadir marca de tiempo
      const entryData = {
        ...formData,
        entry_timestamp: new Date().toISOString()
      };
      
      // Preparar el payload
      const payload = {
        user_id: userId,
        template: selectedTemplate.name,
        entry_data: JSON.stringify(entryData)
      };
      
      // Insertar directamente en Supabase
      const { error } = await supabase
        .from('flight_logs_custom')
        .insert(payload);
        
      if (error) throw error;
      
      // Resetear formulario después de enviarlo con éxito
      setFormData({});
      setShowForm(false);
      setSelectedTemplate(null);
      
      // Actualizar la lista de entradas
      fetchEntries();
      
    } catch (err) {
      console.error("Error al añadir entrada:", err);
      setError("Error al guardar entrada. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas de vuelo
  const calculateStats = (entries) => {
    let totalHours = 0;
    const flightTypes = {};
    
    entries.forEach(entry => {
      let entryData = {};
      try {
        entryData = JSON.parse(entry.entry_data);
      } catch (error) {
        console.error('Error al parsear entry_data:', error);
      }
      
      // Intentar obtener horas de vuelo (si existe el campo)
      if (entryData['Flight Hours'] || entryData['Hours'] || entryData['Total Duration of Flight']) {
        const hours = parseFloat(
          entryData['Flight Hours'] || 
          entryData['Hours'] || 
          entryData['Total Duration of Flight']
        ) || 0;
        totalHours += hours;
      }
      
      // Contar tipos de vuelo
      const flightType = entryData['Flight Type'] || entryData['Type'] || 'No especificado';
      flightTypes[flightType] = (flightTypes[flightType] || 0) + 1;
    });
    
    setStats({
      totalEntries: entries.length,
      totalHours,
      flightTypes
    });
  };

  // Función para filtrar entradas según la plantilla seleccionada
  const getFilteredEntries = () => {
    if (activeTemplate === 'all') {
      return entries;
    }
    return entries.filter(entry => entry.template === activeTemplate);
  };

  const filteredEntries = getFilteredEntries();

  // Función para agrupar entradas por mes y año
  const groupEntriesByMonth = (entries) => {
    const grouped = {};
    
    entries.forEach(entry => {
      let timestamp;
      try {
        timestamp = new Date(entry.entry_timestamp);
      } catch (e) {
        timestamp = new Date(); // Fallback: fecha actual
      }
      
      const monthYear = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      
      grouped[monthYear].push(entry);
    });
    
    return grouped;
  };

  const groupedEntries = groupEntriesByMonth(filteredEntries);

  // Formatear el mes y año para mostrarlo
  const formatMonthYear = (monthYear) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  // Obtener icono para tipos de entrada comunes
  const getFieldIcon = (fieldName) => {
    const fieldNameLower = fieldName.toLowerCase();
    
    if (fieldNameLower.includes('aircraft') || fieldNameLower.includes('avión')) return '✈️';
    if (fieldNameLower.includes('from') || fieldNameLower.includes('departure') || fieldNameLower.includes('origen')) return '🛫';
    if (fieldNameLower.includes('to') || fieldNameLower.includes('arrival') || fieldNameLower.includes('destino')) return '🛬';
    if (fieldNameLower.includes('hours') || fieldNameLower.includes('time') || fieldNameLower.includes('horas') || fieldNameLower.includes('duration')) return '⏱️';
    if (fieldNameLower.includes('date') || fieldNameLower.includes('fecha')) return '📅';
    if (fieldNameLower.includes('instructor') || fieldNameLower.includes('captain') || fieldNameLower.includes('piloto')) return '👨‍✈️';
    if (fieldNameLower.includes('notes') || fieldNameLower.includes('comments') || fieldNameLower.includes('notas') || fieldNameLower.includes('remarks')) return '📝';
    if (fieldNameLower.includes('type') || fieldNameLower.includes('tipo')) return '🏷️';
    
    return '•';
  };
  
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
        <p className="loading-text">Cargando tu logbook...</p>
      </div>
    );
  };

  // Renderizar plantillas disponibles
  const renderTemplateFilters = () => {
    return (
      <div className="logbook-filters">
        <div className="filter-group">
          <label>Filtrar por plantilla:</label>
          <div className="template-buttons">
            <button 
              className={activeTemplate === 'all' ? 'active' : ''} 
              onClick={() => setActiveTemplate('all')}
            >
              Todas
            </button>
            
            {templates.map((template, index) => (
              <button 
                key={index} 
                className={activeTemplate === template ? 'active' : ''}
                onClick={() => setActiveTemplate(template)}
              >
                {template}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Renderizar entradas agrupadas por mes
  const renderEntries = () => {
    return (
      <div className="logbook-entries">
        {Object.keys(groupedEntries)
          .sort((a, b) => b.localeCompare(a)) // Ordenar de más reciente a más antiguo
          .map(monthYear => (
            <div key={monthYear} className="month-group">
              <h3 className="month-title">{formatMonthYear(monthYear)}</h3>
              
              <div className="month-entries">
                {groupedEntries[monthYear].map((entry, index) => {
                  let entryData = {};
                  try {
                    entryData = JSON.parse(entry.entry_data);
                  } catch (error) {
                    console.error('Error al parsear entry_data:', error);
                  }
                  
                  return (
                    <div key={index} className="logbook-entry">
                      <div className="entry-header">
                        <h4>
                          {entryData.Date || new Date(entry.entry_timestamp).toLocaleDateString()}
                        </h4>
                        <span className="entry-template">{entry.template}</span>
                      </div>
                      
                      <div className="entry-content">
                        {Object.entries(entryData).map(([key, value], i) => (
                          <div key={i} className="entry-field">
                            <span className="field-label">{getFieldIcon(key)} {key}</span>
                            <span className="field-value">{value}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="entry-footer">
                        <span className="timestamp">
                          Registrado: {new Date(entry.entry_timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    );
  };

  // Renderizar selección de plantilla
  const renderTemplateSelection = () => {
    const templatesList = Object.keys(TEMPLATES_CONFIG).map(key => ({
      key: key,
      name: TEMPLATES_CONFIG[key].name,
      fields: TEMPLATES_CONFIG[key].fields
    }));
    
    return (
      <div className="template-selection">
        <h3 className="form-section-title">Seleccionar plantilla de Logbook</h3>
        <div className="template-options">
          {templatesList.map((template, index) => (
            <div 
              key={index}
              className={`template-option ${selectedTemplate?.key === template.key ? 'active' : ''}`}
              onClick={() => handleTemplateSelect(template)}
            >
              <div className="template-name">{template.name}</div>
              <div className="template-fields-count">{template.fields.length} campos</div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Renderizar personalización de campos
  const renderFieldCustomization = () => {
    if (!selectedTemplate || !isCustomizing) return null;
    
    return (
      <div className="field-customization">
        <h3 className="form-section-title">Personalizar campos</h3>
        <p className="form-section-description">
          Selecciona los campos que quieres incluir en tu logbook:
        </p>
        
        <div className="field-options">
          {selectedTemplate.fields.map((field, index) => (
            <div 
              key={index}
              className="field-option"
            >
              <label>
                <input
                  type="checkbox"
                  checked={customFields.includes(field)}
                  onChange={() => toggleFieldSelection(field)}
                />
                {field}
              </label>
            </div>
          ))}
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => setIsCustomizing(false)}
          >
            Continuar al formulario
          </button>
        </div>
      </div>
    );
  };
  
  // Renderizar formulario de entrada
  const renderEntryForm = () => {
    if (!selectedTemplate || isCustomizing) return null;
    
    return (
      <form onSubmit={handleSubmit} className="log-entry-form">
        <h3 className="form-section-title">Añadir nuevo registro de vuelo</h3>
        
        <div className="form-fields">
          {customFields.map((field, index) => (
            <div key={index} className="form-field">
              <label htmlFor={`field-${index}`}>{field}:</label>
              <input
                id={`field-${index}`}
                type={field === 'Date' ? 'date' : 'text'}
                value={formData[field] || ''}
                onChange={(e) => handleInputChange(field, e.target.value)}
                required={field === 'Date'}
              />
            </div>
          ))}
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => handleCustomizeFields()}
          >
            Personalizar campos
          </button>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar entrada'}
          </button>
        </div>
      </form>
    );
  };

  // Renderizar mensaje si no hay entradas
  const renderNoEntries = () => {
    return (
      <div className="no-entries">
        <div className="no-entries-icon">📝</div>
        <h3 className="no-entries-title">
          No tienes registros de vuelo
          {activeTemplate !== 'all' ? ` con la plantilla "${activeTemplate}"` : ''}
        </h3>
        <p className="no-entries-message">
          Tu logbook digital te permite registrar y hacer seguimiento de todas tus horas de vuelo.
          Comienza añadiendo tu primer registro.
        </p>
        <button 
          className="add-entry-btn"
          onClick={() => setShowForm(true)}
        >
          <span>+</span>
          <span>Añadir nuevo registro</span>
        </button>
      </div>
    );
  };

  return (
    <div className="logbook-container" data-theme={isDarkMode ? 'dark' : 'light'}>
      <div className="logbook-header">
        <div>
          <h1 className="logbook-title">Mi Logbook Digital</h1>
          <p className="logbook-subtitle">
            {stats.totalEntries} vuelos registrados · {stats.totalHours.toFixed(1)} horas totales
          </p>
        </div>
        <div className="header-controls">
          {!showForm && (
            <button 
              className="header-control-btn add-btn"
              onClick={() => setShowForm(true)}
              title="Añadir nuevo registro"
            >
              +
            </button>
          )}
          <button 
            className="header-control-btn"
            onClick={toggleDarkMode}
            title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      
      <div className="logbook-content">
        {renderError()}
        
        {showForm ? (
          <div className="form-container">
            <div className="form-header">
              <h2>Nuevo registro de vuelo</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowForm(false);
                  setSelectedTemplate(null);
                  setFormData({});
                }}
              >
                &times;
              </button>
            </div>
            
            {!selectedTemplate ? (
              renderTemplateSelection()
            ) : (
              <>
                {renderFieldCustomization()}
                {renderEntryForm()}
              </>
            )}
          </div>
        ) : (
          <>
            {renderTemplateFilters()}
            
            {loading ? (
              renderLoading()
            ) : filteredEntries.length > 0 ? (
              renderEntries()
            ) : (
              renderNoEntries()
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Logbook;