import React, { useState } from 'react';
import { SignupFieldsProps } from './signupTypes';
import { FIELD_LABEL_CLASS, FIELD_INPUT_CLASS, validatedFieldClass } from './signupFieldStyles';
import PasswordVisibilityToggle from './PasswordVisibilityToggle';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import useFieldValidity from './useFieldValidity';

/** Campo de contraseña + toggle de visibilidad + medidor de fuerza (FC184 F3, Scenario 3/4).
 *  Extraído de `SignupIdentityFields` para mantenerla bajo Gate 2. */
function SignupPasswordField({ data, onChange, loading }: SignupFieldsProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1 mb-4">
      <label htmlFor="signup-password" className={FIELD_LABEL_CLASS}>
        Contraseña
      </label>
      <div className="relative">
        <input
          id="signup-password"
          type={visible ? 'text' : 'password'}
          minLength={8}
          value={data.password}
          onChange={(e): void => onChange('password', e.target.value)}
          className={FIELD_INPUT_CLASS}
          disabled={loading}
          required
        />
        <PasswordVisibilityToggle
          visible={visible}
          onToggle={(): void => setVisible((v) => !v)}
          targetId="signup-password"
        />
      </div>
      <PasswordStrengthMeter password={data.password} />
    </div>
  );
}

/** `true` si ambos campos tienen contenido y coinciden exactamente. */
function passwordsMatch(password: string, confirmPassword: string): boolean {
  return confirmPassword.length > 0 && password === confirmPassword;
}

/** Campo de confirmación de contraseña + toggle + alerta de desajuste (FC184 F3, Scenario 3/4).
 *  Extraído de `SignupIdentityFields` para mantenerla bajo Gate 2. */
function SignupConfirmPasswordField({
  data,
  onChange,
  loading,
}: SignupFieldsProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const confirm = useFieldValidity(data.confirmPassword, (v) => passwordsMatch(data.password, v));

  return (
    <div className="flex flex-col gap-1 mb-4">
      <label htmlFor="signup-confirm-password" className={FIELD_LABEL_CLASS}>
        Confirmar Contraseña
      </label>
      <div className="relative">
        <input
          id="signup-confirm-password"
          type={visible ? 'text' : 'password'}
          minLength={8}
          value={data.confirmPassword}
          onChange={(e): void => onChange('confirmPassword', e.target.value)}
          onBlur={confirm.markTouched}
          className={validatedFieldClass(confirm.touched, confirm.valid)}
          disabled={loading}
          aria-invalid={confirm.touched && !confirm.valid}
          required
        />
        <PasswordVisibilityToggle
          visible={visible}
          onToggle={(): void => setVisible((v) => !v)}
          targetId="signup-confirm-password"
        />
      </div>
      {confirm.touched && !confirm.valid && (
        <p className="text-red-600 text-xs font-bold" data-testid="signup-confirm-password-error">
          Las contraseñas no coinciden.
        </p>
      )}
    </div>
  );
}

/** Contraseña + confirmación — FC184 F3 (Password_Security_Confirm_Strength_And_Visibility_Toggle).
 *  Archivo propio (no dentro de `Signup.tsx`) siguiendo el mismo patrón de `SignupRfcAndCpFields.tsx`
 *  (F2): agregar esta sección habría vuelto a empujar `Signup.tsx` sobre el límite de Gate 2. */
export default function SignupPasswordFields(props: SignupFieldsProps): React.JSX.Element {
  return (
    <>
      <SignupPasswordField {...props} />
      <SignupConfirmPasswordField {...props} />
    </>
  );
}
