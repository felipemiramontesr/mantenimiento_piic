import React from 'react';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface FamilyScopeGateProps {
  children: React.ReactNode;
}

const FamilyScopeGate: React.FC<FamilyScopeGateProps> = ({ children }) => {
  const { currentUser } = useAuth();

  if (currentUser?.roleId === 5) {
    return <>{children}</>;
  }

  return (
    <div
      data-testid="family-scope-denied"
      className="flex flex-col items-center justify-center gap-4 py-20"
    >
      <ShieldOff className="w-8 h-8 text-red-400" />
      <p className="text-archon-sm text-slate-400 uppercase tracking-widest">
        Acceso exclusivo para Familiar
      </p>
    </div>
  );
};

export default FamilyScopeGate;
