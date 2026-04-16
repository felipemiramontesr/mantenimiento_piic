import React from 'react';
import { LucideIcon } from 'lucide-react';

// ⚡ ARCHON UNITARY FIELD COMPONENT (v.9.0.0)
// Encapsulates the Icon + Label + Input/Select pattern for Sovereign UI

interface ArchonFieldProps {
  label: string;
  icon: LucideIcon;
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
  <div className={`archon-form-group ${className}`}>
    <label className="archon-label">
      <Icon size={12} className={required ? 'text-[#f2b705]' : ''} />
      {label}
      {required && <span className="ml-1 opacity-40">*</span>}
    </label>
    {children}
  </div>
);

export default ArchonField;
