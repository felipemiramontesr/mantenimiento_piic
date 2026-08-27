import React from 'react';
import { Building2, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ArchonAddressField from '../Common/ArchonAddressField';
import { getProfileTitle } from './OwnerProfilePanel/types';
import { useOwnerProfileState } from './OwnerProfilePanel/useOwnerProfileState';
import { ProfileFields } from './OwnerProfilePanel/ProfileFields';
import { ProfileStatusMessages } from './OwnerProfilePanel/ProfileStatusMessages';

const OwnerProfilePanel: React.FC = (): React.JSX.Element => {
  const { currentUser, ownerType } = useAuth();
  const roleId = currentUser?.roleId ?? 0;

  const {
    form,
    setForm,
    addressValue,
    setAddressValue,
    isLoading,
    isSubmitting,
    success,
    error,
    handleSave,
  } = useOwnerProfileState(roleId);

  if (isLoading) {
    return (
      <div data-testid="owner-profile-loading" className="flex items-center justify-center py-12">
        <span className="text-archon-muted text-sm">Cargando perfil...</span>
      </div>
    );
  }

  return (
    <div data-testid="owner-profile-panel" className="archon-card space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-archon-border">
        <Building2 className="w-5 h-5 text-archon-accent" />
        <h3 className="text-archon-primary font-semibold text-sm">{getProfileTitle(ownerType)}</h3>
      </div>

      <ProfileFields form={form} setForm={setForm} roleId={roleId} />

      <ArchonAddressField value={addressValue} onChange={setAddressValue} />

      <ProfileStatusMessages success={success} error={error} />

      <div className="flex justify-end pt-4">
        <button
          type="button"
          data-testid="owner-profile-save"
          className="archon-btn-primary flex items-center gap-2"
          onClick={handleSave}
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? 'Guardando...' : 'Guardar Perfil'}
        </button>
      </div>
    </div>
  );
};

export default OwnerProfilePanel;
