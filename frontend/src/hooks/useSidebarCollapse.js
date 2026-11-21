import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'mediconnect_sidebar_collapsed';
export const SIDEBAR_EXPANDED_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 70;

/**
 * Shared hook to manage sidebar collapse/expand state across all 6 MediConnect portals.
 * - Persists user preference in localStorage under 'mediconnect_sidebar_collapsed'
 * - Standardizes expanded width (240px) and collapsed width (70px)
 * - Synchronizes across tabs and view transitions
 */
export const useSidebarCollapse = (defaultState = false) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch (e) {
      console.warn('Could not read sidebar collapse state from localStorage:', e);
    }
    return defaultState;
  });

  const setCollapsedState = useCallback((val) => {
    setIsCollapsed(val);
    try {
      localStorage.setItem(STORAGE_KEY, String(val));
    } catch (e) {
      console.warn('Could not persist sidebar collapse state to localStorage:', e);
    }
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch (e) {
        console.warn('Could not persist sidebar collapse state to localStorage:', e);
      }
      return next;
    });
  }, []);

  // Listen for storage changes across tabs or window instances
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setIsCollapsed(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  return {
    isCollapsed,
    setIsCollapsed: setCollapsedState,
    toggleCollapse,
    sidebarWidth,
    SIDEBAR_EXPANDED_WIDTH,
    SIDEBAR_COLLAPSED_WIDTH
  };
};

export default useSidebarCollapse;
