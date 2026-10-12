import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createPost } from './arcsialCoreApi';
import PostComposer from './PostComposer';

/**
 * FC210 F3 — caja de publicación: texto, hasta 4 imágenes https con vista previa, visibilidad y
 * autoría (personal o a nombre del Universo solo para su MU).
 */

vi.mock('./arcsialCoreApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./arcsialCoreApi')>()),
  createPost: vi.fn(),
}));

const onPosted = vi.fn();
const MU = { id: 41, label: 'Flota Norte' };

/** Escribe en el campo de texto. */
function type(text: string): void {
  fireEvent.change(screen.getByTestId('composer-text'), { target: { value: text } });
}

/** Agrega una imagen por URL. */
function addImage(url: string): void {
  fireEvent.change(screen.getByTestId('composer-image-input'), { target: { value: url } });
  fireEvent.click(screen.getByTestId('composer-image-add'));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createPost).mockResolvedValue(undefined);
});

describe('PostComposer', () => {
  it('sin texto no se puede publicar; con texto publica en lo personal y como PUBLIC', async () => {
    render(<PostComposer muUniverse={null} onPosted={onPosted} />);
    expect(screen.getByTestId('composer-submit')).toBeDisabled();
    expect(screen.queryByTestId('composer-authorship')).toBeNull();
    type('  Hola Arcsial  ');
    expect(screen.getByTestId('composer-count')).toHaveTextContent('16 / 1000');
    fireEvent.click(screen.getByTestId('composer-submit'));
    await waitFor(() => expect(onPosted).toHaveBeenCalledTimes(1));
    expect(createPost).toHaveBeenCalledWith({
      contentText: 'Hola Arcsial',
      imageUrls: [],
      visibility: 'PUBLIC',
    });
    expect(screen.getByTestId('composer-text')).toHaveValue('');
  });

  it('imágenes: solo https, sin repetidas, con vista previa y botón para quitarlas', () => {
    render(<PostComposer muUniverse={null} onPosted={onPosted} />);
    addImage('http://cdn.example/a.png');
    expect(screen.getByTestId('composer-error')).toHaveTextContent('https');
    expect(screen.queryByTestId('composer-images')).toBeNull();
    addImage(' https://cdn.example/a.png ');
    addImage('https://cdn.example/a.png');
    expect(screen.queryByTestId('composer-error')).toBeNull();
    expect(screen.getByTestId('composer-images').querySelectorAll('img')).toHaveLength(1);
    expect(screen.getByTestId('composer-image-input')).toHaveValue('');
    fireEvent.click(screen.getByTestId('composer-image-remove-0'));
    expect(screen.queryByTestId('composer-images')).toBeNull();
  });

  it('al llegar a 4 imágenes el campo desaparece; van en el envío y se limpian después', async () => {
    render(<PostComposer muUniverse={null} onPosted={onPosted} />);
    const urls = ['a', 'b', 'c', 'd'].map((name) => `https://cdn.example/${name}.png`);
    urls.forEach(addImage);
    expect(screen.queryByTestId('composer-image-input')).toBeNull();
    type('Con fotos');
    fireEvent.change(screen.getByTestId('composer-visibility'), {
      target: { value: 'CONTACTS' },
    });
    fireEvent.click(screen.getByTestId('composer-submit'));
    await waitFor(() => expect(onPosted).toHaveBeenCalled());
    expect(createPost).toHaveBeenCalledWith({
      contentText: 'Con fotos',
      imageUrls: urls,
      visibility: 'CONTACTS',
    });
    expect(screen.queryByTestId('composer-images')).toBeNull();
    expect(screen.getByTestId('composer-image-input')).toBeInTheDocument();
  });

  it('el MU elige publicar como su Universo, y puede volver a lo personal', async () => {
    render(<PostComposer muUniverse={MU} onPosted={onPosted} />);
    const authorship = screen.getByTestId('composer-authorship');
    expect(authorship).toHaveTextContent('Como Flota Norte');
    fireEvent.change(authorship, { target: { value: 'universe' } });
    type('Aviso');
    fireEvent.click(screen.getByTestId('composer-submit'));
    await waitFor(() => expect(createPost).toHaveBeenCalledTimes(1));
    expect(createPost).toHaveBeenLastCalledWith({
      contentText: 'Aviso',
      imageUrls: [],
      visibility: 'PUBLIC',
      asUniverseTenantId: 41,
    });
    fireEvent.change(authorship, { target: { value: 'personal' } });
    type('Personal');
    fireEvent.click(screen.getByTestId('composer-submit'));
    await waitFor(() => expect(createPost).toHaveBeenCalledTimes(2));
    expect(createPost).toHaveBeenLastCalledWith({
      contentText: 'Personal',
      imageUrls: [],
      visibility: 'PUBLIC',
    });
  });

  it('si el servidor rechaza (placas o VIN) muestra el motivo y conserva el texto', async () => {
    vi.mocked(createPost).mockRejectedValue({
      response: { data: { code: 'PII_DETECTED_IN_POST' } },
    });
    render(<PostComposer muUniverse={null} onPosted={onPosted} />);
    type('Vendo ABC-1234');
    fireEvent.click(screen.getByTestId('composer-submit'));
    expect(await screen.findByTestId('composer-error')).toHaveTextContent('datos sensibles');
    expect(screen.getByTestId('composer-text')).toHaveValue('Vendo ABC-1234');
    expect(onPosted).not.toHaveBeenCalled();
  });
});
