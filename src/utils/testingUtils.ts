import { supabase } from "@/integrations/supabase/client";

/**
 * Limpia completamente todos los datos locales y de sesión
 * Útil para testing y desarrollo
 */
export const performCompleteReset = async (): Promise<void> => {
  try {
    // 1. Logout de Supabase (limpia tokens automáticamente)
    await supabase.auth.signOut();
    
    // 2. Limpiar localStorage
    localStorage.clear();
    
    // 3. Limpiar sessionStorage
    sessionStorage.clear();
    
    // 4. Limpiar cookies de la app
    // Obtener todas las cookies del dominio actual
    const cookies = document.cookie.split(";");
    
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      
      // Eliminar cookie para el dominio actual y todos los paths
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      
      // Eliminar cookie para subdominio
      const domain = window.location.hostname;
      const parts = domain.split(".");
      if (parts.length > 1) {
        const parentDomain = parts.slice(-2).join(".");
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${parentDomain}`;
      }
    }
    
    // 5. Limpiar IndexedDB si existe
    if (window.indexedDB) {
      const databases = await window.indexedDB.databases();
      databases.forEach((db) => {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
        }
      });
    }
    
    console.log("✅ Reset completo ejecutado correctamente");
  } catch (error) {
    console.error("Error durante el reset:", error);
    // Incluso si hay error, intentar limpiar localStorage y sessionStorage
    localStorage.clear();
    sessionStorage.clear();
  }
};

/**
 * Verifica si existen datos residuales de sesiones anteriores
 */
export const hasResidualData = (): boolean => {
  const hasLocalStorage = localStorage.length > 0;
  const hasSessionStorage = sessionStorage.length > 0;
  const hasCookies = document.cookie.length > 0;
  
  return hasLocalStorage || hasSessionStorage || hasCookies;
};

/**
 * Determina si estamos en modo desarrollo/testing
 */
export const isTestingMode = (): boolean => {
  // Verificar si estamos en desarrollo
  const isDev = import.meta.env.DEV;
  
  // Verificar si hay un flag de testing en la URL
  const urlParams = new URLSearchParams(window.location.search);
  const testingFlag = urlParams.get('testing');
  
  // O verificar si el hostname incluye 'localhost' o 'preview'
  const isLocalOrPreview = 
    window.location.hostname === 'localhost' || 
    window.location.hostname.includes('lovable.app');
  
  return isDev || testingFlag === 'true' || isLocalOrPreview;
};
