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
});
