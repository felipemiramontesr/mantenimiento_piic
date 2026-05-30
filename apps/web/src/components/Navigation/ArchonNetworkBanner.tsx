import React from 'react';
import { WifiOff } from 'lucide-react';
import useNetworkStatus from '../../hooks/useNetworkStatus';

const ArchonNetworkBanner: React.FC = () => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="w-full bg-amber-500 text-white px-4 py-2 flex items-center justify-center space-x-2 shadow-sm z-50 fixed top-0 left-0 right-0">
      <WifiOff size={16} />
      <span className="text-sm font-medium font-['Inter']">
        Estás en modo sin conexión. Las modificaciones están temporalmente deshabilitadas.
      </span>
    </div>
  );
};

export default ArchonNetworkBanner;
