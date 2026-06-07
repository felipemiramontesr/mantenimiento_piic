import React, { useEffect } from 'react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import AlertsPanel from '../../components/Identity/AlertsPanel';

const AlertsModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();

  useEffect((): void => {
    setSectionData('Alertas del Sistema', 'Monitor de alertas operativas de la flota', null);
  }, [setSectionData]);

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <AlertsPanel />
          </div>
        </div>
      </section>
    </div>
  );
};

export default AlertsModule;
