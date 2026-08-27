import React from 'react';
import { EgressModalHeader } from './EgressRegistrationModal/EgressModalHeader';
import { UnitCategoryFields } from './EgressRegistrationModal/UnitCategoryFields';
import { AmountVendorFields } from './EgressRegistrationModal/AmountVendorFields';
import { NotesAndActions } from './EgressRegistrationModal/NotesAndActions';
import { useEgressRegistrationState } from './EgressRegistrationModal/useEgressRegistrationState';

interface EgressRegistrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const EgressRegistrationModal: React.FC<EgressRegistrationModalProps> = ({
  onClose,
  onSuccess,
}): React.ReactElement => {
  const { units, form, fieldError, handleChange, inputCls, submitting, handleSubmit } =
    useEgressRegistrationState(onSuccess);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[4px] shadow-2xl w-full max-w-md mx-4 animate-in slide-in-from-bottom-4 duration-300">
        <EgressModalHeader onClose={onClose} />

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <UnitCategoryFields
            units={units}
            form={form}
            fieldError={fieldError}
            handleChange={handleChange}
            inputCls={inputCls}
          />
          <AmountVendorFields
            form={form}
            fieldError={fieldError}
            handleChange={handleChange}
            inputCls={inputCls}
          />
          <NotesAndActions
            form={form}
            fieldError={fieldError}
            handleChange={handleChange}
            inputCls={inputCls}
            submitting={submitting}
            onClose={onClose}
          />
        </form>
      </div>
    </div>
  );
};

export default EgressRegistrationModal;
