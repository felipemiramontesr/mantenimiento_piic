import React from 'react';
import { useAccessControlState } from './AccessControlSlideOver/useAccessControlState';
import { PersonnelRegistryFeed } from './AccessControlSlideOver/PersonnelRegistryFeed';
import { PersonnelRegistrationForm } from './AccessControlSlideOver/PersonnelRegistrationForm';
import {
  SlideOverHeader,
  SlideOverTabs,
  SlideOverBackdrop,
} from './AccessControlSlideOver/SlideOverChrome';

interface AccessControlSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 🔱 Archon Identity: AccessControlSlideOver
 * Version: 1.1.0
 * Purpose: Unified interface for personnel management and role assignment.
 */
const AccessControlSlideOver: React.FC<AccessControlSlideOverProps> = ({ isOpen, onClose }) => {
  const { view, setView, users, formData, setFormData, isLoading, error, handleRegister } =
    useAccessControlState(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end overflow-hidden">
      <SlideOverBackdrop onClose={onClose} />

      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        <SlideOverHeader onClose={onClose} />
        <SlideOverTabs view={view} onSelectView={setView} />

        <div className="flex-1 overflow-y-auto p-8">
          {view === 'list' ? (
            <PersonnelRegistryFeed isLoading={isLoading} users={users} />
          ) : (
            <PersonnelRegistrationForm
              formData={formData}
              setFormData={setFormData}
              error={error}
              isLoading={isLoading}
              onSubmit={(e: React.FormEvent): void => {
                handleRegister(e).catch(() => undefined);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessControlSlideOver;
