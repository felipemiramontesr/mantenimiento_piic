import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router';
import SignupPage from './Signup';
import api from '../../api/client';

/** FC177 F2 — Public_Signup_Endpoint_And_Form. Same test shape as `Login.test.tsx`, minus
 *  AuthProvider/useNavigate — Signup is a fully public page that never issues a session
 *  (Scenario 1: the account is born in quarantine, submitting shows a confirmation, not a
 *  redirect to /dashboard). */

vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
    defaults: { baseURL: 'https://apiv1.piic.com.mx/v1' },
  },
}));

const VALID_FIELDS = {
  fullName: 'Cliente Ejemplo',
  email: 'cliente@ejemplo.mx',
  password: 'PasswordSegura123',
  rfc: 'ABC010101AB9',
  codigoPostalFiscal: '06600',
  razonSocial: 'Cliente Ejemplo SA de CV',
  regimenFiscal: '601',
};

function fillRequiredFields(): void {
  fireEvent.change(screen.getByLabelText('Nombre Completo'), {
    target: { value: VALID_FIELDS.fullName },
  });
  fireEvent.change(screen.getByLabelText('Correo Electrónico'), {
    target: { value: VALID_FIELDS.email },
  });
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: VALID_FIELDS.password },
  });
  fireEvent.change(screen.getByLabelText('Confirmar Contraseña'), {
    target: { value: VALID_FIELDS.password },
  });
  fireEvent.change(screen.getByLabelText('RFC'), { target: { value: VALID_FIELDS.rfc } });
  fireEvent.change(screen.getByLabelText('Código Postal Fiscal'), {
    target: { value: VALID_FIELDS.codigoPostalFiscal },
  });
  fireEvent.change(screen.getByLabelText('Razón Social'), {
    target: { value: VALID_FIELDS.razonSocial },
  });
  fireEvent.change(screen.getByLabelText('Régimen Fiscal'), {
    target: { value: VALID_FIELDS.regimenFiscal },
  });
}

describe('SignupPage Component (FC177 F2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (): ReturnType<typeof render> =>
    render(
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>
    );

  it('renders the identity and fiscal fields plus the submit button', () => {
    renderComponent();
    expect(screen.getByLabelText('Nombre Completo')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo Electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('RFC')).toBeInTheDocument();
    expect(screen.getByLabelText('Código Postal Fiscal')).toBeInTheDocument();
    expect(screen.getByLabelText('Razón Social')).toBeInTheDocument();
    expect(screen.getByLabelText('Régimen Fiscal')).toBeInTheDocument();
    expect(screen.getByLabelText('Teléfono (Opcional)')).toBeInTheDocument();
    expect(screen.getByTestId('signup-submit')).toBeInTheDocument();
  });

  it('Scenario 1: submits to /public/signup and shows the pending-activation confirmation, no redirect', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { success: true } });
    renderComponent();

    fillRequiredFields();
    fireEvent.click(screen.getByTestId('signup-submit'));

    expect(api.post).toHaveBeenCalledWith('/public/signup', {
      fullName: VALID_FIELDS.fullName,
      email: VALID_FIELDS.email,
      password: VALID_FIELDS.password,
      rfc: VALID_FIELDS.rfc,
      codigoPostalFiscal: VALID_FIELDS.codigoPostalFiscal,
      razonSocial: VALID_FIELDS.razonSocial,
      regimenFiscal: VALID_FIELDS.regimenFiscal,
    });

    await waitFor(() => {
      expect(screen.getByTestId('signup-success')).toBeInTheDocument();
    });
    expect(screen.getByText(/pendiente de activación/i)).toBeInTheDocument();
    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument();
  });

  it('telefono opcional se incluye en el payload solo si el usuario lo llena', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { success: true } });
    renderComponent();

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText('Teléfono (Opcional)'), {
      target: { value: '5551234567' },
    });
    fireEvent.click(screen.getByTestId('signup-submit'));

    expect(api.post).toHaveBeenCalledWith(
      '/public/signup',
      expect.objectContaining({ telefono: '5551234567' })
    );
  });

  it('409 conflict → mensaje de cuenta existente, formulario permanece visible', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({ response: { status: 409 } });
    renderComponent();

    fillRequiredFields();
    fireEvent.click(screen.getByTestId('signup-submit'));

    await waitFor(() => {
      expect(screen.getByText(/ya existe una cuenta registrada/i)).toBeInTheDocument();
    });
    expect(screen.getByTestId('signup-form')).toBeInTheDocument();
  });

  it('400 validation error → mensaje de formato inválido', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({ response: { status: 400 } });
    renderComponent();

    fillRequiredFields();
    fireEvent.click(screen.getByTestId('signup-submit'));

    await waitFor(() => {
      expect(screen.getByText(/no tienen un formato válido/i)).toBeInTheDocument();
    });
  });

  it('error de red/500 → mensaje de conexión genérico', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({ response: { status: 500 } });
    renderComponent();

    fillRequiredFields();
    fireEvent.click(screen.getByTestId('signup-submit'));

    await waitFor(() => {
      expect(screen.getByText(/error de conexión/i)).toBeInTheDocument();
    });
    expect(screen.getByTestId('signup-submit')).not.toBeDisabled();
  });

  it('link "Inicia sesión" apunta a /login', () => {
    renderComponent();
    expect(screen.getByText(/inicia sesión/i).closest('a')).toHaveAttribute('href', '/login');
  });

  // FC184 F2 — Signup_Client_Side_RFC_And_Postal_Validation.
  describe('FC184 F2 — validación reactiva de RFC y Código Postal', () => {
    it('el botón de envío está deshabilitado hasta que RFC y CP tengan formato válido (Scenario 2)', () => {
      renderComponent();
      expect(screen.getByTestId('signup-submit')).toBeDisabled();

      fillRequiredFields();
      expect(screen.getByTestId('signup-submit')).not.toBeDisabled();
    });

    it('RFC inválido: muestra el error solo después de que el campo pierde el foco', () => {
      renderComponent();
      const rfcInput = screen.getByLabelText('RFC');

      fireEvent.change(rfcInput, { target: { value: 'ABC123' } });
      expect(screen.queryByTestId('signup-rfc-error')).not.toBeInTheDocument();

      fireEvent.blur(rfcInput);
      expect(screen.getByTestId('signup-rfc-error')).toBeInTheDocument();
    });

    it('RFC válido tras corregirlo: el error desaparece y el submit se habilita (con el resto de campos)', () => {
      renderComponent();
      const rfcInput = screen.getByLabelText('RFC');

      fireEvent.change(rfcInput, { target: { value: 'ABC123' } });
      fireEvent.blur(rfcInput);
      expect(screen.getByTestId('signup-rfc-error')).toBeInTheDocument();

      fireEvent.change(rfcInput, { target: { value: VALID_FIELDS.rfc } });
      expect(screen.queryByTestId('signup-rfc-error')).not.toBeInTheDocument();
    });

    it('Código Postal: filtra caracteres no numéricos y limita a 5 dígitos', () => {
      renderComponent();
      const cpInput = screen.getByLabelText('Código Postal Fiscal') as HTMLInputElement;

      fireEvent.change(cpInput, { target: { value: '06a6b00c99' } });
      expect(cpInput).toHaveValue('06600');
    });

    it('Código Postal inválido (menos de 5 dígitos): muestra error tras perder el foco', () => {
      renderComponent();
      const cpInput = screen.getByLabelText('Código Postal Fiscal');

      fireEvent.change(cpInput, { target: { value: '066' } });
      fireEvent.blur(cpInput);
      expect(screen.getByTestId('signup-cp-error')).toBeInTheDocument();
    });

    it('RFC/CP con formato inválido: el envío del formulario permanece bloqueado (no llama a la API)', () => {
      renderComponent();
      fillRequiredFields();
      fireEvent.change(screen.getByLabelText('RFC'), { target: { value: 'INVALIDO' } });

      fireEvent.click(screen.getByTestId('signup-submit'));
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  // FC184 F3 — Password_Security_Confirm_Strength_And_Visibility_Toggle.
  describe('FC184 F3 — confirmación de contraseña, medidor de fuerza y toggles de visibilidad', () => {
    it('confirmPassword no coincide: alerta el desajuste y bloquea el submit (Scenario 3)', () => {
      renderComponent();
      fillRequiredFields();
      const confirmInput = screen.getByLabelText('Confirmar Contraseña');

      fireEvent.change(confirmInput, { target: { value: 'OtraClaveDistinta1' } });
      fireEvent.blur(confirmInput);

      expect(screen.getByTestId('signup-confirm-password-error')).toBeInTheDocument();
      expect(screen.getByTestId('signup-submit')).toBeDisabled();
    });

    it('confirmPassword corregido para coincidir: el error desaparece y el submit se habilita', () => {
      renderComponent();
      fillRequiredFields();
      const confirmInput = screen.getByLabelText('Confirmar Contraseña');

      fireEvent.change(confirmInput, { target: { value: 'OtraClaveDistinta1' } });
      fireEvent.blur(confirmInput);
      expect(screen.getByTestId('signup-confirm-password-error')).toBeInTheDocument();

      fireEvent.change(confirmInput, { target: { value: VALID_FIELDS.password } });
      expect(screen.queryByTestId('signup-confirm-password-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('signup-submit')).not.toBeDisabled();
    });

    it('el medidor de fuerza aparece y muestra "Débil" para una contraseña trivial (Scenario 3)', () => {
      renderComponent();
      fireEvent.change(screen.getByLabelText('Contraseña'), {
        target: { value: 'password123' },
      });
      expect(screen.getByTestId('signup-password-strength')).toHaveTextContent(/débil/i);
    });

    it('el medidor de fuerza no se muestra con el campo de contraseña vacío', () => {
      renderComponent();
      expect(screen.queryByTestId('signup-password-strength')).not.toBeInTheDocument();
    });

    it('toggle de visibilidad en "Contraseña": alterna entre password y text (Scenario 4)', () => {
      renderComponent();
      const passwordInput = screen.getByLabelText('Contraseña');
      expect(passwordInput).toHaveAttribute('type', 'password');

      fireEvent.click(screen.getByTestId('signup-password-toggle-visibility'));
      expect(passwordInput).toHaveAttribute('type', 'text');

      fireEvent.click(screen.getByTestId('signup-password-toggle-visibility'));
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('toggle de visibilidad en "Confirmar Contraseña": alterna entre password y text (Scenario 4)', () => {
      renderComponent();
      const confirmInput = screen.getByLabelText('Confirmar Contraseña');
      expect(confirmInput).toHaveAttribute('type', 'password');

      fireEvent.click(screen.getByTestId('signup-confirm-password-toggle-visibility'));
      expect(confirmInput).toHaveAttribute('type', 'text');
    });

    it('Scenario 1 sigue enviando solo los campos del backend — confirmPassword NUNCA viaja en el payload', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { success: true } });
      renderComponent();
      fillRequiredFields();
      fireEvent.click(screen.getByTestId('signup-submit'));

      const [, payload] = (api.post as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(payload).not.toHaveProperty('confirmPassword');
      await waitFor(() => expect(screen.getByTestId('signup-success')).toBeInTheDocument());
    });
  });
});
