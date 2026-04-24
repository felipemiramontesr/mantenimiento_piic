import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Navigation/Sidebar';
import { FleetProvider } from '../../context/FleetContext';

const DashboardLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(true);

  return (
    <FleetProvider>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isCollapsed ? '80px 1fr' : '20% 1fr',
          height: '100vh',
          width: '100vw',
          overflow: 'hidden',
          backgroundColor: '#0f2a44', // Sidebar background foundation
        }}
        className="transition-all duration-300 ease-in-out"
      >
        <Sidebar isCollapsed={isCollapsed} onToggle={(): void => setIsCollapsed(!isCollapsed)} />
        <main
          style={{
            backgroundColor: '#ffffff',
            overflowY: 'auto',
            height: '100vh',
            position: 'relative',
          }}
        >
          <Outlet />
        </main>
      </div>
    </FleetProvider>
  );
};

export default DashboardLayout;
