import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SectionKey, normalizeSection } from '@/types/sections';

/**
 * Hook de navigation pour les sections de l'éditeur de livret
 * - Source de vérité = query string ?section= et state local synchronisés
 * - Au changement d'onglet, met à jour URL + state
 * - Au montage, lit l'URL, normalise via normalizeSection, puis charge la bonne vue
 */
export function useSectionRouter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState<SectionKey>(() => {
    return normalizeSection(searchParams.get('section'));
  });

  // Synchronise l'état avec les query params au montage et lors des changements
  useEffect(() => {
    const urlSection = searchParams.get('section');
    const normalized = normalizeSection(urlSection);
    
    // Si la section normalisée est différente de l'URL, mettre à jour l'URL
    if (urlSection && urlSection !== normalized) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('section', normalized);
      setSearchParams(newParams, { replace: true });
    }
    
    setSection(normalized);
  }, [searchParams, setSearchParams]);

  // Navigation vers une nouvelle section
  const navigate = useCallback((next: SectionKey) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('section', next);
    setSearchParams(newParams);
    setSection(next);
    
    // Scroll to top du conteneur au changement de section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, setSearchParams]);

  return { section, navigate };
}
