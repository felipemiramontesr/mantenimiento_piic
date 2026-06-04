import React from 'react';
import { LucideIcon } from 'lucide-react';

// ⚡ ARCHON UNITARY FIELD COMPONENT (v.9.0.0)
// Encapsulates the Icon + Label + Input/Select pattern for Sovereign UI

interface ArchonFieldProps {
  label: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}

const ArchonField: React.FC<ArchonFieldProps> = ({
  label,
  icon: Icon,
  children,
  className = '',
  required = false,
}) => (
  <div className={`flex flex-col gap-1.5 w-full ${className}`}>
    <label className="text-archon-base font-black uppercase tracking-[0.15em] text-[#0f2a44]/50 flex items-center gap-2 mb-1">
      {Icon && <Icon size={12} className="text-[#f2b705]" />}
      {label}
      {required && <span className="ml-1 opacity-40">*</span>}
    </label>
    {children}
  </div>
);

export default ArchonField;
