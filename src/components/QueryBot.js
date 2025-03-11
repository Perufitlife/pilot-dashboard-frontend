import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import axios from 'axios';
import '../styles/QueryBot.css';

// Componente de mensaje con nuevo diseño
const Message = memo(({ message }) => {
  const { type, text, isError, source, cached } = message;
  
  const formatText = (text) => {
    if (!text || typeof text !== 'string') return '';
    
    // Procesar texto con formato
    const formattedText = text
      .replace(/(\d+\.\s)/g, '<span class="list-marker">$1</span>')
      .replace(/•\s/g, '<span class="bullet-marker">•</span> ');
      
    const lines = formattedText.split('\n');
    return lines.map((line, i) => (
      <p key={i} dangerouslySetInnerHTML={{ __html: line }}></p>
    ));
  };
  
  return (
    <div className={`message-card ${type} ${isError ? 'error' : ''} ${cached ? 'cached' : ''}`}>
      {type === 'bot' && (
        <div className="avatar bot-avatar">
          <span className="avatar-icon">🤖</span>
        </div>
      )}
      
      <div className="message-bubble">
        <div className="message-content">
          {formatText(text)}
        </div>
        
        {source && typeof source === 'object' && (
          <div className="source-panel">
            <div className="source-header">
              <span className="source-icon">📑</span>
              <span className="source-title">Fuente del documento</span>
            </div>
            <div className="source-details">
              <div className="source-name">{source.document || 'introduction of flying.pdf'}</div>
              {source.page && source.page !== 'N/A' && (
                <div className="source-page">Página {source.page}</div>
              )}
              {source.page_range && source.page_range !== 'N/A' && (
                <div className="source-page-range">Rango de páginas: {source.page_range}</div>
              )}
              {source.confidence && (
                <div className="confidence-meter">
                  <div 
                    className="confidence-bar" 
                    style={{ width: `${source.confidence * 100}%` }}
                  ></div>
                  <span className="confidence-label">{Math.round(source.confidence * 100)}% confianza</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Opcional: Mostrar todas las fuentes si hay múltiples */}
        {message.all_sources && message.all_sources.length > 0 && (
          <div className="additional-sources">
            <div className="additional-sources-header">Páginas consultadas:</div>
            <div className="additional-sources-list">
              {message.all_sources.map((src, idx) => (
                <div key={idx} className="additional-source-item">
                  {src.page && src.page !== 'N/A' && (
                    <span className="source-page-badge">Pág. {src.page}</span>
                  )}
                  {src.page_range && src.page_range !== 'N/A' && src.page_range !== src.page && (
                    <span className="source-page-range-badge">Rango {src.page_range}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}          
        {cached && (
          <div className="cache-indicator">
            <span className="cache-icon">⚡</span>
            <span>Respuesta rápida (caché)</span>
          </div>
        )}
      </div>
      
      {type === 'user' && (
        <div className="avatar user-avatar">
          <span className="avatar-icon">👤</span>
        </div>
      )}
    </div>
  );
});

// Panel de modo de búsqueda completamente rediseñado
const SearchModePanel = memo(({ favoriteDocsInfo, language, onToggleFavorites }) => {
  const hasNoFavorites = !favoriteDocsInfo || !favoriteDocsInfo.hasFavorites;
  
  return (
    <div className="search-mode-panel">
      <div className="mode-toggle">
        <button 
          className={`mode-btn ${hasNoFavorites ? 'active' : ''}`}
          onClick={() => onToggleFavorites(false)}
        >
          <span className="mode-icon">🔍</span>
          <span>{language === 'es' ? 'Todos los documentos' : 'All documents'}</span>
        </button>
        <button 
          className={`mode-btn ${!hasNoFavorites ? 'active' : ''}`}
          onClick={() => onToggleFavorites(true)}
        >
          <span className="mode-icon">⭐</span>
          <span>{language === 'es' ? 'Favoritos' : 'Favorites'}</span>
        </button>
      </div>
      
      {!hasNoFavorites && (
        <div className="favorites-panel">
          <div className="favorites-header">
            {language === 'es' ? 'Documentos seleccionados' : 'Selected documents'}
          </div>
          <div className="favorites-list">
            {favoriteDocsInfo.documents.map((doc, index) => (
              <div key={index} className="favorite-item">
                <span className="doc-type-icon">
                  {doc.filename.endsWith('.pdf') ? '📕' : 
                   doc.filename.endsWith('.docx') ? '📘' : 
                   doc.filename.endsWith('.txt') ? '📃' : '📄'}
                </span>
                <span className="doc-name">{doc.filename}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Componente principal rediseñado
function QueryBot({ userId }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([{ 
    type: 'bot', 
    text: '¡Hola! Soy tu asistente de documentos. Puedes preguntarme sobre tus archivos en español o inglés.' 
  }]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState(() => {
    const savedLang = localStorage.getItem('querybot-language');
    return savedLang || (navigator.language.startsWith('es') ? 'es' : 'en');
  });
  const [favoriteDocsInfo, setFavoriteDocsInfo] = useState(null);
  const [expandedUI, setExpandedUI] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('querybot-darkmode');
    return savedMode === 'true' || false;
  });
  
  // Cache y referencias
  const questionsCache = useRef(new Map());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  const apiClient = useRef(axios.create({
    baseURL: window.location.origin,
    timeout: 30000,
  })).current;

  // Efecto para modo oscuro
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('querybot-darkmode', darkMode);
  }, [darkMode]);

  // Guardar preferencia de idioma
  useEffect(() => {
    localStorage.setItem('querybot-language', language);
  }, [language]);

  // Obtener documentos favoritos
  const fetchFavoriteDocuments = useCallback(async () => {
    if (!userId) return;
    
    try {
      const response = await apiClient.get(`/api/favorite-documents?user_id=${userId}`);
      setFavoriteDocsInfo(response.data);
    } catch (error) {
      console.error('Error al obtener documentos favoritos:', error);
    }
  }, [userId, apiClient]);
  
  useEffect(() => {
    fetchFavoriteDocuments();
    
    // Limpiar cache periódicamente
    const cacheCleanupInterval = setInterval(() => {
      if (questionsCache.current.size > 50) {
        const entries = Array.from(questionsCache.current.entries());
        const recentEntries = entries.slice(-20);
        questionsCache.current = new Map(recentEntries);
      }
    }, 60000);
    
    return () => {
      clearInterval(cacheCleanupInterval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [userId, fetchFavoriteDocuments]);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus en input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Manejar envío de pregunta
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;
    
    // Cancelar solicitud anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Crear nuevo controlador para esta solicitud
    abortControllerRef.current = new AbortController();
    
    // Verificar caché
    const cacheKey = `${trimmedQuestion}-${language}-${userId}`;
    if (questionsCache.current.has(cacheKey)) {
      const cachedResponse = questionsCache.current.get(cacheKey);
      setMessages(prev => [...prev, 
        { type: 'user', text: trimmedQuestion },
        { ...cachedResponse, type: 'bot', cached: true }
      ]);
      setQuestion('');
      return;
    }
    
    // Añadir mensaje del usuario
    setMessages(prev => [...prev, { type: 'user', text: trimmedQuestion }]);
    setQuestion('');
    setLoading(true);
    
    try {
      const response = await apiClient.post('/api/ask', {
        question: trimmedQuestion,
        language,
        user_id: userId
      }, {
        signal: abortControllerRef.current.signal
      });
      
      // Procesar respuesta
      let answerText = '';
      if (response.data && typeof response.data === 'object') {
        answerText = response.data.answer || 'No se encontró respuesta';
      } else if (typeof response.data === 'string') {
        answerText = response.data;
      } else {
        answerText = 'Respuesta recibida en formato desconocido';
      }
      
      // Asegurarse de que la fuente tenga los datos correctos
      let sourceObj = null;
      if (response.data && response.data.source) {
        sourceObj = {
          ...response.data.source,
          // Si el documento está vacío, usar un valor por defecto
          document: response.data.source.document || 'introduction of flying.pdf',
          // Asegurar que page y page_range estén correctos
          page: response.data.source.page || 'N/A',
          page_range: response.data.source.page_range || 'N/A'
        };
      }

      // Asegurarse de que todas las fuentes tengan datos correctos
      let allSourcesArray = [];
      if (response.data && response.data.all_sources && response.data.all_sources.length > 0) {
        allSourcesArray = response.data.all_sources.map(source => ({
          ...source,
          document: source.document || 'introduction of flying.pdf',
          page: source.page || 'N/A',
          page_range: source.page_range || 'N/A'
        }));
      }

      const botResponse = {
        type: 'bot',
        text: answerText,
        source: sourceObj,
        all_sources: allSourcesArray,
        timestamp: new Date().toISOString()
      };

      // Log para depuración
      console.log("Respuesta procesada:", botResponse);

      // Log de fuentes de documentos
      if (botResponse.all_sources && botResponse.all_sources.length > 0) {
        console.log("Fuentes utilizadas:");
        botResponse.all_sources.forEach((source, index) => {
          let pageInfo = source.page && source.page !== 'N/A' ? `Página: ${source.page}` : '';
          let rangeInfo = source.page_range && source.page_range !== 'N/A' ? `Rango: ${source.page_range}` : '';
          let pageDisplay = pageInfo || rangeInfo || 'Sin información de páginas';
          
          console.log(`${index + 1}. Documento: ${source.document} - ${pageDisplay} - Confianza: ${(source.confidence * 100).toFixed(2)}%`);
        });
      } else if (botResponse.source) {
        let source = botResponse.source;
        let pageInfo = source.page && source.page !== 'N/A' ? `Página: ${source.page}` : '';
        let rangeInfo = source.page_range && source.page_range !== 'N/A' ? `Rango: ${source.page_range}` : '';
        let pageDisplay = pageInfo || rangeInfo || 'Sin información de páginas';
        
        console.log("Fuente utilizada:", 
          `Documento: ${source.document} - ${pageDisplay} - Confianza: ${(source.confidence * 100).toFixed(2)}%`);
      } else {
        console.log("No se encontraron fuentes específicas");
      }

            
      // Guardar en caché
      questionsCache.current.set(cacheKey, botResponse);
          
      // Añadir respuesta
      setMessages(prev => [...prev, botResponse]);
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error al enviar la pregunta:', error);
        const errorMessage = language === 'es' 
          ? 'Error al obtener respuesta. Por favor, intenta de nuevo.' 
          : 'Error getting response. Please try again.';
        setMessages(prev => [...prev, { type: 'bot', text: errorMessage, isError: true }]);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Manejar teclas
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Cambiar modo favoritos
  const handleToggleFavorites = (useFavorites) => {
    if (!favoriteDocsInfo) return;
    
    setFavoriteDocsInfo(prev => ({
      ...prev,
      hasFavorites: useFavorites
    }));
  };

  // Texto del placeholder
  const getPlaceholderText = useCallback(() => {
    if (loading) {
      return language === 'es' ? "Analizando documentos..." : "Analyzing documents...";
    }
    return language === 'es' ? "Pregunta sobre tus documentos..." : "Ask about your documents...";
  }, [loading, language]);

  return (
    <div className={`qbot-container ${darkMode ? 'dark-mode' : ''} ${expandedUI ? 'expanded' : ''}`}>
      <div className="qbot-header">
        <div className="qbot-title">
          <span className="title-icon">💬</span>
          <h2>{language === 'es' ? "Asistente de documentos" : "Document Assistant"}</h2>
        </div>
        
        <div className="qbot-controls">
          <button 
            className="control-btn lang-btn"
            onClick={() => setLanguage(prev => prev === 'es' ? 'en' : 'es')}
            title={language === 'es' ? "Switch to English" : "Cambiar a Español"}
          >
            {language === 'es' ? '🇪🇸' : '🇬🇧'}
          </button>
          
          <button 
            className="control-btn theme-btn"
            onClick={() => setDarkMode(prev => !prev)}
            title={darkMode ? "Modo claro" : "Modo oscuro"}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          
          <button 
            className="control-btn expand-btn"
            onClick={() => setExpandedUI(prev => !prev)}
            title={expandedUI ? "Contraer" : "Expandir"}
          >
            {expandedUI ? '🔍' : '🔎'}
          </button>
        </div>
      </div>
      
      {/* Panel de búsqueda rediseñado */}
      {favoriteDocsInfo !== null && (
        <SearchModePanel 
          favoriteDocsInfo={favoriteDocsInfo} 
          language={language} 
          onToggleFavorites={handleToggleFavorites}
        />
      )}

      
      <div className="chat-area">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-chat-message">
              {language === 'es' ? "Comienza a hacer preguntas sobre tus documentos" : "Start asking questions about your documents"}
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <Message key={index} message={msg} />
              ))}
              
              {loading && (
                <div className="message-card bot">
                  <div className="avatar bot-avatar">
                    <span className="avatar-icon">🤖</span>
                  </div>
                  <div className="message-bubble loading-bubble">
                    <div className="pulse-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>


      
      <form onSubmit={handleSubmit} className="message-form">
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholderText()}
            disabled={loading}
            rows={2} 
            className="message-input"
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(Math.max(e.target.scrollHeight, 55), 120) + 'px';
            }}
          />
          <button 
            type="submit" 
            disabled={loading || !question.trim()}
            className="send-button"
            aria-label={language === 'es' ? "Enviar mensaje" : "Send message"}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
            </svg>
          </button>
        </div>
        
        {expandedUI && (
          <div className="message-tools">
            <button type="button" className="tool-btn" title="Adjuntar archivo">
              <span>📎</span>
            </button>
            <button type="button" className="tool-btn" title="Insertar emoji">
              <span>😊</span>
            </button>
            <button type="button" className="tool-btn" title="Grabar audio">
              <span>🎙️</span>
            </button>
          </div>
        )}
      </form>
      
      <div className="assistant-info">
        {language === 'es' 
          ? `Asistente de documentos basado en la colección: ${favoriteDocsInfo?.hasFavorites ? 'Favoritos' : 'Completa'}`
          : `Document assistant based on collection: ${favoriteDocsInfo?.hasFavorites ? 'Favorites' : 'Complete'}`}
      </div>
    </div>
  );
}

export default QueryBot;
