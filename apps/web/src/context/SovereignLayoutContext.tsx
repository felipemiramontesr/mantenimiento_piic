import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * 🔱 Archon Context: SovereignLayoutContext
 * Implementation: Global Layout Metadata Orchestration
 * Objective: Centralize section titles, technical descriptions, and generic search state.
 * v.2.0.0 - Polymorphic / Universal Search Integration (DRY Compliant)
 */

export interface SearchSuggestion {
  id: string; // Unique ID for React rendering and lookup
  title: string; // Primary search result title (e.g., "ASM-002")
  subtitle: string; // Primary detail (e.g., "Modelo: Aveo")
  metaLabel: string; // Matched attribute key/label (e.g., "Placas")
  metaValue: string; // Matched attribute value (e.g., "XYZ-987")
  rawItem: unknown; // Polymorphic reference to the original object
}

export interface UniversalSearchConfig {
  placeholder: string;
  getSuggestions: (term: string) => SearchSuggestion[];
  onSuggestionSelect: (suggestion: SearchSuggestion) => void;
}

interface LayoutData {
  title: string;
  description: string;
  subheaderActions?: React.ReactNode;
  headerAction?: {
    variant: 'navy' | 'emerald' | 'red' | 'yellow' | 'sky' | 'violet' | 'blue';
    headerTitle: string;
    HeaderIcon: LucideIcon;
    actionTitle: string;
    description: string;
    PayloadIcon: LucideIcon;
    buttonText: string;
    isActive: boolean;
    onClick: () => void;
    testId?: string;
  } | null;
}

interface SovereignLayoutContextType {
  layoutData: LayoutData;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchConfig: UniversalSearchConfig | null;
  setSearchConfig: (config: UniversalSearchConfig | null) => void;
  setSectionData: (
    title: string,
    description: string,
    subheaderActions?: React.ReactNode,
    headerAction?: LayoutData['headerAction']
  ) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

const SovereignLayoutContext = createContext<SovereignLayoutContextType | undefined>(undefined);

export const SovereignLayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [layoutData, setLayoutData] = useState<LayoutData>({
    title: 'Sovereign System',
    description: 'Industrial Logistics Management Console',
    subheaderActions: null,
    headerAction: null,
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchConfig, setSearchConfig] = useState<UniversalSearchConfig | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const setSectionData = useCallback(
    (
      title: string,
      description: string,
      subheaderActions?: React.ReactNode,
      headerAction?: LayoutData['headerAction']
    ): void => {
      setLayoutData({ title, description, subheaderActions, headerAction });
    },
    []
  );

  return (
    <SovereignLayoutContext.Provider
      value={{
        layoutData,
        searchTerm,
        setSearchTerm,
        searchConfig,
        setSearchConfig,
        setSectionData,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
      }}
    >
      {children}
    </SovereignLayoutContext.Provider>
  );
};

export const useSovereignLayout = (): SovereignLayoutContextType => {
  const context = useContext(SovereignLayoutContext);
  if (context === undefined) {
    throw new Error('useSovereignLayout must be used within a SovereignLayoutProvider');
  }
  return context;
};
