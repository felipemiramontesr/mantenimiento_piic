/** Forma compartida del formulario de autoregistro y sus grupos de campos — extraído de
 *  `Signup.tsx` (FC184 F2) para que `SignupRfcAndCpFields.tsx` pueda importarla sin crear un
 *  ciclo (`Signup.tsx` ↔ el archivo de campos extraído). */
export interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  codigoPostalFiscal: string;
  telefono: string;
}

export interface SignupFieldsProps {
  readonly data: SignupFormData;
  readonly onChange: (field: keyof SignupFormData, value: string) => void;
  readonly loading: boolean;
}
