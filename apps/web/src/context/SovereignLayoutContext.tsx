import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * 🔱 Archon Context: SovereignLayoutContext
 * Implementation: Global Layout Metadata Orchestration
 * Objective: Centralize section titles and technical descriptions for the Sovereign Header.
 * v.1.1.0 - Hardened with useCallback to prevent infinite loops
 */

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
  } | null;
}

interface SovereignLayoutContextType {
  layoutData: LayoutData;
  setSectionData: (
    title: string,
    description: string,
    subheaderActions?: React.ReactNode,
    headerAction?: LayoutData['headerAction']
  ) => void;
}

const SovereignLayoutContext = createContext<SovereignLayoutContextType | undefined>(undefined);

export const SovereignLayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [layoutData, setLayoutData] = useState<LayoutData>({
    title: 'Sovereign System',
    description: 'Industrial Logistics Management Console',
    subheaderActions: null,
    headerAction: null,
  });

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
    <SovereignLayoutContext.Provider value={{ layoutData, setSectionData }}>
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
