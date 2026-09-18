import React from 'react';
import { SignupFieldsProps } from './signupTypes';
import { FIELD_LABEL_CLASS, validatedFieldClass } from './signupFieldStyles';
import { isValidRfc, isValidPostalCode } from './signupValidation';
import useFieldValidity from './useFieldValidity';

interface ValidatedFieldMessageProps {
  readonly show: boolean;
  readonly testId: string;
  readonly message: string;
}

/** Mensaje inline de error — compartido por los campos RFC y CP. */
function ValidatedFieldMessage({
  show,
  testId,
  message,
}: ValidatedFieldMessageProps): React.JSX.Element | null {
  if (!show) return null;
  return (
    <p className="text-red-600 text-xs font-bold" data-testid={testId}>
      {message}
    </p>
  );
}

/** Campo RFC — extraído de `SignupRfcAndCpFields` para mantenerla bajo Gate 2. */
function SignupRfcField({ data, onChange, loading }: SignupFieldsProps): React.JSX.Element {
  const rfc = useFieldValidity(data.rfc, isValidRfc);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="signup-rfc" className={FIELD_LABEL_CLASS}>
        RFC
      </label>
      <input
        id="signup-rfc"
        type="text"
        value={data.rfc}
        onChange={(e): void => onChange('rfc', e.target.value.toUpperCase())}
        onBlur={rfc.markTouched}
        className={validatedFieldClass(rfc.touched, rfc.valid)}
        disabled={loading}
        aria-invalid={rfc.touched && !rfc.valid}
        required
      />
      <ValidatedFieldMessage
        show={rfc.touched && !rfc.valid}
        testId="signup-rfc-error"
        message="RFC inválido — formato SAT (12 o 13 caracteres, ej. XAXX010101000)."
      />
    </div>
  );
}

/** Campo Código Postal fiscal — extraído de `SignupRfcAndCpFields` para mantenerla bajo Gate 2. */
function SignupCpField({ data, onChange, loading }: SignupFieldsProps): React.JSX.Element {
  const cp = useFieldValidity(data.codigoPostalFiscal, isValidPostalCode);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="signup-cp" className={FIELD_LABEL_CLASS}>
        Código Postal Fiscal
      </label>
      <input
        id="signup-cp"
        type="text"
        inputMode="numeric"
        maxLength={5}
        value={data.codigoPostalFiscal}
        onChange={(e): void =>
          onChange('codigoPostalFiscal', e.target.value.replace(/\D/g, '').slice(0, 5))
        }
        onBlur={cp.markTouched}
        className={validatedFieldClass(cp.touched, cp.valid)}
        disabled={loading}
        aria-invalid={cp.touched && !cp.valid}
        required
      />
      <ValidatedFieldMessage
        show={cp.touched && !cp.valid}
        testId="signup-cp-error"
        message="Código Postal debe tener 5 dígitos numéricos."
      />
    </div>
  );
}

/** RFC + Código Postal fiscal — mitad superior de los datos de la Constancia SAT. FC184 F2:
 *  validación reactiva con el patrón canónico del backend (`signupValidation.ts`), feedback visual
 *  solo tras la primera interacción de cada campo (`useFieldValidity`). Archivo propio (no dentro
 *  de `Signup.tsx`) porque agregar esta validación empujó el archivo sobre el límite de 400
 *  líneas de Gate 2. */
export default function SignupRfcAndCpFields({
  data,
  onChange,
  loading,
}: SignupFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <SignupRfcField data={data} onChange={onChange} loading={loading} />
      <SignupCpField data={data} onChange={onChange} loading={loading} />
    </div>
  );
}
