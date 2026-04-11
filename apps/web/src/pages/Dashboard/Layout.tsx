import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Navigation/Sidebar';

const DashboardLayout: React.FC = () => (
    <div className="flex h-screen overflow-hidden bg-pinnacle-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <Outlet />
      </main>
    </div>
);

export default DashboardLayout;
