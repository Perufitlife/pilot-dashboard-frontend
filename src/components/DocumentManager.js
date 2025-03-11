import React, { useState, useEffect } from 'react';
import supabase from '../services/supabase';
import '../styles/DocumentManager.css';

// Componente principal
const DocumentManager = ({ user }) => {
  // Extraemos el ID del usuario del objeto "user"
  const userId = user.id;

  // Categorías con iconos y descripciones mejoradas
  const categories = {
    "MAN_OPER": {
      title: "Manuales operativos",
      description: "SOP, FCOM, FCTM, QRH, MEL y documentos de referencia para operaciones.",
      icon: "📘",
      count: 0
    },
    "DOC_REGL": {
      title: "Documentación reglamentaria",
      description: "RAC, FAR, AIP, NOTAM y otras regulaciones aeronáuticas.",
      icon: "📜",
      count: 0
    },
    "MAT_TECN": {
      title: "Material técnico",
      description: "Sistemas, Performance, W&B y documentación técnica específica.",
      icon: "🔧",
      count: 0
    },
    "MAT_ENTR": {
      title: "Material de entrenamiento",
      description: "Manuales, Técnicas de vuelo, CRM y guías de formación.",
      icon: "🎓",
      count: 0
    },
    "DOC_PERS": {
      title: "Documentación personal",
      description: "Licencias, Certificados, Records y documentos personales.",
      icon: "🪪",
      count: 0
    },
    "MET": {
      title: "Meteorología",
      description: "Informes, Pronósticos, Condiciones adversas y mapas meteorológicos.",
      icon: "🌦️",
      count: 0
    },
    "SEG_OPER": {
      title: "Seguridad operacional",
      description: "SMS, Reportes, Análisis de riesgos y procedimientos de seguridad.",
      icon: "🛡️",
      count: 0
    },
    "NAV": {
      title: "Navegación",
      description: "Cartas, Aproximación, RNAV/RNP y referencias de navegación.",
      icon: "🧭",
      count: 0
    },
    "OTROS": {
      title: "Otros documentos",
      description: "Documentación variada y recursos adicionales.",
      icon: "📋",
      count: 0
    }
  };
  
  // Estados
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [favoriteDocuments, setFavoriteDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Obtener documentos favoritos
  useEffect(() => {
    const fetchFavoriteDocuments = async () => {
      try {
        const { data, error } = await supabase
          .from('user_favorite_documents')
          .select('document_id')
          .eq('user_id', userId);

        if (error) throw error;

        const favoriteIds = data.map(item => item.document_id);
        setFavoriteDocuments(favoriteIds);
        
        // Cargar información completa de los documentos favoritos
        if (favoriteIds.length > 0) {
          const { data: favDocuments, error: favError } = await supabase
            .from('aviation_documents')
            .select('*')
            .in('id', favoriteIds);
            
          if (favError) throw favError;
          
          // Filtrar documentos para incluir solo los favoritos
          setDocuments(prevDocs => {
            const allDocs = [...prevDocs];
            favDocuments.forEach(favDoc => {
              if (!allDocs.some(doc => doc.id === favDoc.id)) {
                allDocs.push(favDoc);
              }
            });
            return allDocs;
          });
        }
      } catch (error) {
        console.error('Error fetching favorite documents:', error);
      }
    };

    fetchFavoriteDocuments();
  }, [userId]);

  // Obtener conteo de documentos por categoría
  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('aviation_documents')
          .select('category, count')
          .groupBy('category');

        if (error) throw error;

        const counts = {};
        data.forEach(item => {
          counts[item.category] = parseInt(item.count);
        });
        
        setCategoryCounts(counts);
      } catch (error) {
        console.error('Error fetching category counts:', error);
      }
    };

    fetchCategoryCounts();
  }, []);

  // Obtener documentos para la categoría seleccionada
  const fetchDocumentsInCategory = async (category) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('aviation_documents')
        .select('*')
        .eq('category', category);

      if (error) throw error;

      setDocuments(data || []);
      setSelectedCategory(category);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Alternar estado de favorito
  const toggleFavorite = async (documentId) => {
    try {
      if (favoriteDocuments.includes(documentId)) {
        // Eliminar de favoritos
        await supabase
          .from('user_favorite_documents')
          .delete()
          .eq('user_id', userId)
          .eq('document_id', documentId);
        
        setFavoriteDocuments(prev => prev.filter(id => id !== documentId));
      } else {
        // Verificar si el usuario ya tiene 5 documentos favoritos
        if (favoriteDocuments.length >= 5) {
          alert('Ya tienes 5 documentos favoritos. Elimina alguno antes de añadir uno nuevo.');
          return;
        }

        // Añadir a favoritos
        await supabase
          .from('user_favorite_documents')
          .insert({ user_id: userId, document_id: documentId });
        
        setFavoriteDocuments(prev => [...prev, documentId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Alternar modo oscuro
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.setAttribute('data-theme', isDarkMode ? 'light' : 'dark');
  };

  // Filtrar documentos por término de búsqueda
  const filteredDocuments = documents.filter(doc => {
    if (!searchTerm) return true;
    return doc.filename.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Ordenar documentos
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    if (sortOrder === 'name-asc') {
      return a.filename.localeCompare(b.filename);
    }
    if (sortOrder === 'name-desc') {
      return b.filename.localeCompare(a.filename);
    }
    if (sortOrder === 'date-asc') {
      return new Date(a.upload_date) - new Date(b.upload_date);
    }
    if (sortOrder === 'date-desc') {
      return new Date(b.upload_date) - new Date(a.upload_date);
    }
    return 0;
  });

  // Obtener documentos favoritos
  const getFavoriteDocuments = () => {
    return documents.filter(doc => favoriteDocuments.includes(doc.id));
  };

  // Cambiar el orden de clasificación
  const handleSortChange = () => {
    const orders = ['name-asc', 'name-desc', 'date-asc', 'date-desc'];
    const currentIndex = orders.indexOf(sortOrder);
    const nextIndex = (currentIndex + 1) % orders.length;
    setSortOrder(orders[nextIndex]);
  };

  // Formatear fecha para mostrar
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Renderizar icono de orden
  const renderSortIcon = () => {
    if (sortOrder === 'name-asc') return '↓A';
    if (sortOrder === 'name-desc') return '↑A';
    if (sortOrder === 'date-asc') return '↓🕒';
    if (sortOrder === 'date-desc') return '↑🕒';
    return '↓A';
  };

  // Renderizar sección de documentos favoritos
  const renderFavoriteDocuments = () => {
    const favDocs = getFavoriteDocuments();
    
    return (
      <div className="favorite-documents">
        <div className="favorite-header">
          <h3 className="favorite-title">
            <span className="favorite-title-icon">❤️</span>
            Mis Documentos Favoritos
          </h3>
          <span>{favDocs.length} / 5</span>
        </div>
        
        <div className="favorite-body">
          {favDocs.length === 0 ? (
            <div className="empty-favorites">
              Aún no has añadido documentos a favoritos.
              Explora las categorías y marca los documentos importantes.
            </div>
          ) : (
            <div className="document-list">
              {favDocs.map(doc => (
                <div key={doc.id} className="document-item favorite">
                  <div className="document-info">
                    <span className="document-icon">
                      {categories[doc.category]?.icon || '📄'}
                    </span>
                    <div className="document-details">
                      <h4 className="document-name">{doc.filename}</h4>
                      <div className="document-meta">
                        <span>{categories[doc.category]?.title}</span>
                        <span>{formatDate(doc.upload_date || new Date())}</span>
                      </div>
                    </div>
                  </div>
                  <div className="document-actions">
                    <button 
                      className="document-action-btn"
                      title="Descargar documento"
                      onClick={() => console.log('Descargar:', doc.id)}
                    >
                      ⬇️
                    </button>
                    <button 
                      onClick={() => toggleFavorite(doc.id)}
                      className="favorite-toggle active"
                      title="Quitar de favoritos"
                    >
                      ❤️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Renderizar contenido principal (categorías o documentos)
  const renderContent = () => {
    if (loading) {
      return (
        <div className="loader-container">
          <span className="loader"></span>
        </div>
      );
    }

    if (!selectedCategory) {
      return (
        <div className="categories-content">
          <h3 className="categories-header">Categorías de Documentos</h3>
          <div className="categories-grid">
            {Object.entries(categories).map(([code, category]) => (
              <div 
                key={code} 
                className="category-card"
                onClick={() => fetchDocumentsInCategory(code)}
              >
                <div className="category-body">
                  <span className="category-code">{code}</span>
                  <h4 className="category-title">
                    <span>{category.icon}</span> {category.title}
                  </h4>
                  <p className="category-description">{category.description}</p>
                </div>
                <div className="category-footer">
                  <span>{categoryCounts[code] || 0} documentos</span>
                  <span>Acceder →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    const currentCategory = categories[selectedCategory];

    return (
      <div className="documents-view">
        <div className="documents-nav">
          <button 
            onClick={() => setSelectedCategory(null)} 
            className="back-btn"
          >
            <span className="back-btn-icon">←</span>
            Volver a Categorías
          </button>
          <h3 className="documents-title">
            {currentCategory?.icon} {currentCategory?.title}
          </h3>
        </div>
        
        <div className="documents-filter">
          <input
            type="text"
            className="filter-input"
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            className="sort-btn"
            onClick={handleSortChange}
            title="Cambiar orden"
          >
            {renderSortIcon()}
          </button>
        </div>
        
        {sortedDocuments.length === 0 ? (
          <div className="empty-favorites">
            No hay documentos que coincidan con tu búsqueda.
          </div>
        ) : (
          <div className="document-list">
            {sortedDocuments.map(doc => (
              <div key={doc.id} className="document-item">
                <div className="document-info">
                  <span className="document-icon">
                    {categories[doc.category]?.icon || '📄'}
                  </span>
                  <div className="document-details">
                    <h4 className="document-name">{doc.filename}</h4>
                    <div className="document-meta">
                      <span>{categories[doc.category]?.title}</span>
                      <span>{formatDate(doc.upload_date || new Date())}</span>
                      <span>{doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="document-actions">
                  <button 
                    className="document-action-btn"
                    title="Descargar documento"
                    onClick={() => console.log('Descargar:', doc.id)}
                  >
                    ⬇️
                  </button>
                  <button 
                    onClick={() => toggleFavorite(doc.id)}
                    className={`favorite-toggle ${favoriteDocuments.includes(doc.id) ? 'active' : ''}`}
                    title={favoriteDocuments.includes(doc.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                  >
                    {favoriteDocuments.includes(doc.id) ? '❤️' : '🤍'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="document-manager" data-theme={isDarkMode ? 'dark' : 'light'}>
      <div className="doc-manager-header">
        <h2 className="doc-manager-title">Biblioteca Aeronáutica</h2>
        <div className="doc-controls">
          <button 
            className="doc-control-btn"
            onClick={toggleDarkMode}
            title={isDarkMode ? "Modo claro" : "Modo oscuro"}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      {renderFavoriteDocuments()}
      {renderContent()}
    </div>
  );
};

export default DocumentManager;