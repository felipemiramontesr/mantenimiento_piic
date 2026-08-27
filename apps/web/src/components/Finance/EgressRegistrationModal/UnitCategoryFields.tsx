import React from 'react';
import { CATEGORY_LABELS } from '../../../types/finance';
import { FleetUnit } from '../../../types/fleet';
import { ALL_CATEGORIES, EgressFormData, FieldError } from './types';

type EgressChangeHandler = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
) => void;

interface UnitFieldProps {
  units: FleetUnit[];
  unitId: string;
  fieldError: FieldError | null;
  handleChange: EgressChangeHandler;
  inputCls: (field: string) => string;
}

/** Selector de Unidad (FC163 F2B3, split de EgressRegistrationModal). */
const UnitField: React.FC<UnitFieldProps> = ({
  units,
  unitId,
  fieldError,
  handleChange,
  inputCls,
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-archon-base font-black uppercase tracking-[0.15em] text-pinnacle-navy/50">
      Unidad *
    </label>
    <select name="unitId" value={unitId} onChange={handleChange} className={inputCls('unitId')}>
      <option value="">Seleccionar unidad...</option>
      {units.map((u) => (
        <option key={u.id} value={u.id}>
          {u.id} — {u.marca} {u.modelo}
        </option>
      ))}
    </select>
    {fieldError?.field === 'unitId' && (
      <p className="text-archon-base text-sentinel-red font-bold">{fieldError.message}</p>
    )}
  </div>
);

interface CategoryFieldProps {
  category: string;
  fieldError: FieldError | null;
  handleChange: EgressChangeHandler;
  inputCls: (field: string) => string;
}

/** Selector de Categoría (FC163 F2B3, split de EgressRegistrationModal). */
const CategoryField: React.FC<CategoryFieldProps> = ({
  category,
  fieldError,
  handleChange,
  inputCls,
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-archon-base font-black uppercase tracking-[0.15em] text-pinnacle-navy/50">
      Categoría *
    </label>
    <select
      name="category"
      value={category}
      onChange={handleChange}
      className={inputCls('category')}
    >
      <option value="">Seleccionar categoría...</option>
      {ALL_CATEGORIES.map((cat) => (
        <option key={cat} value={cat}>
          {CATEGORY_LABELS[cat]}
        </option>
      ))}
    </select>
    {fieldError?.field === 'category' && (
      <p className="text-archon-base text-sentinel-red font-bold">{fieldError.message}</p>
    )}
  </div>
);

export interface UnitCategoryFieldsProps {
  units: FleetUnit[];
  form: EgressFormData;
  fieldError: FieldError | null;
  handleChange: EgressChangeHandler;
  inputCls: (field: string) => string;
}

/** Selectores de Unidad y Categoría (FC163 F2B3, split de EgressRegistrationModal). */
export const UnitCategoryFields: React.FC<UnitCategoryFieldsProps> = ({
  units,
  form,
  fieldError,
  handleChange,
  inputCls,
}) => (
  <>
    <UnitField
      units={units}
      unitId={form.unitId}
      fieldError={fieldError}
      handleChange={handleChange}
      inputCls={inputCls}
    />
    <CategoryField
      category={form.category}
      fieldError={fieldError}
      handleChange={handleChange}
      inputCls={inputCls}
    />
  </>
);
