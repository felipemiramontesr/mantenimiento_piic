import React, { createContext, useContext, useState, ReactNode } from 'react';

/**
 * 🔱 Archon Context: SovereignLayoutContext
 * Implementation: Global Layout Metadata Orchestration
 * Objective: Centralize section titles and technical descriptions for the Sovereign Header.
 * v.1.0.0
 */

interface LayoutData {
  title: string;
  description: string;
  subheaderActions?: React.ReactNode;
}

interface SovereignLayoutContextType {
  layoutData: LayoutData;
  setSectionData: (title: string, description: string, subheaderActions?: React.ReactNode) => void;
}

const SovereignLayoutContext = createContext<SovereignLayoutContextType | undefined>(undefined);

export const SovereignLayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [layoutData, setLayoutData] = useState<LayoutData>({
    title: 'Sovereign System',
    description: 'Industrial Logistics Management Console',
    subheaderActions: null,
  });

  const setSectionData = (
    title: string,
    description: string,
    subheaderActions?: React.ReactNode
  ): void => {
    setLayoutData({ title, description, subheaderActions });
  };

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
