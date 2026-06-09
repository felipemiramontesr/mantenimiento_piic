import React from 'react';
import AlertsPanel from '../../components/Identity/AlertsPanel';

const AlertsModule: React.FC = (): React.ReactElement => (
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

export default AlertsModule;
