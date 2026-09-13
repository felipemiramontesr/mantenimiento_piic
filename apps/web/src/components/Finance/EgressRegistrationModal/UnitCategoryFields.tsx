import React from 'react';
import { Truck, Tag } from 'lucide-react';
import { CATEGORY_LABELS } from '../../../types/finance';
import { FleetUnit } from '../../../types/fleet';
import { ALL_CATEGORIES, EgressFormData, FieldError } from './types';
import ArchonField from '../../ArchonField';

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
  <ArchonField label="Unidad" icon={Truck} required>
    <select
      id="egress-unit-id"
      name="unitId"
      value={unitId}
      onChange={handleChange}
      className={inputCls('unitId')}
    >
      <option value="">Seleccionar unidad...</option>
      {units.map((u) => (
        <option key={u.id} value={u.id}>
          {u.id} — {u.marca} {u.modelo}
        </option>
      ))}
    </select>
    {fieldError?.field === 'unitId' && (
      <p className="text-archon-base text-red-600 font-bold">{fieldError.message}</p>
    )}
  </ArchonField>
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
  <ArchonField label="Categoría" icon={Tag} required>
    <select
      id="egress-category"
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
      <p className="text-archon-base text-red-600 font-bold">{fieldError.message}</p>
    )}
  </ArchonField>
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
