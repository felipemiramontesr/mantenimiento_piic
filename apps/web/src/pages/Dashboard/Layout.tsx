import Sidebar from '../../components/Navigation/Sidebar';

const DashboardLayout: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    return (
        <div 
          className="grid h-screen overflow-hidden transition-all duration-300 ease-in-out"
          style={{ gridTemplateColumns: isCollapsed ? '80px 1fr' : '20% 1fr' }}
        >
          <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
          <main className="flex-1 overflow-y-auto bg-white relative">
            <Outlet />
          </main>
        </div>
    );
};

export default DashboardLayout;
