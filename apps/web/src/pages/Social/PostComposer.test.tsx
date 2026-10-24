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
    expect(screen.getByTestId('composer-submit')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.submit(screen.getByTestId('post-composer'));
    expect(createPost).not.toHaveBeenCalled();
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

  describe('FC212 F2 (T2)', () => {
    it('S: mientras viaja la publicación todo queda deshabilitado y un segundo clic no publica', async () => {
      let finish: () => void = () => undefined;
      vi.mocked(createPost).mockReturnValue(
        new Promise<void>((resolve) => {
          finish = resolve;
        })
      );
      render(<PostComposer muUniverse={null} onPosted={onPosted} />);
      type('Una sola vez');
      fireEvent.click(screen.getByTestId('composer-submit'));
      expect(screen.getByTestId('composer-fields')).toBeDisabled();
      expect(screen.getByTestId('composer-submit')).toHaveTextContent('Publicando…');
      fireEvent.submit(screen.getByTestId('post-composer'));
      expect(createPost).toHaveBeenCalledTimes(1);
      finish();
      await waitFor(() => expect(screen.getByTestId('composer-fields')).not.toBeDisabled());
      expect(screen.getByTestId('composer-submit')).toHaveTextContent('Publicar');
    });

    it('U ⊤: una dirección pendiente válida viaja aunque no se pulse «Agregar» y el campo se limpia', async () => {
      render(<PostComposer muUniverse={null} onPosted={onPosted} />);
      type('Con foto');
      fireEvent.change(screen.getByTestId('composer-image-input'), {
        target: { value: ' https://cdn.example/foto.webp ' },
      });
      fireEvent.click(screen.getByTestId('composer-submit'));
      await waitFor(() => expect(onPosted).toHaveBeenCalledTimes(1));
      expect(createPost).toHaveBeenCalledWith({
        contentText: 'Con foto',
        imageUrls: ['https://cdn.example/foto.webp'],
        visibility: 'PUBLIC',
      });
      expect(screen.getByTestId('composer-image-input')).toHaveValue('');
    });

    it.each(['http://cdn.example/foto.png', 'https://cdn.example/documento.pdf'])(
      'U ⊥: la dirección pendiente %s detiene el envío con el aviso y no sale del navegador',
      (url) => {
        render(<PostComposer muUniverse={null} onPosted={onPosted} />);
        type('Con foto');
        fireEvent.change(screen.getByTestId('composer-image-input'), { target: { value: url } });
        fireEvent.click(screen.getByTestId('composer-submit'));
        expect(screen.getByTestId('composer-error')).toHaveTextContent('.jpg, .png o .webp');
        expect(createPost).not.toHaveBeenCalled();
        expect(screen.getByTestId('composer-text')).toHaveValue('Con foto');
      }
    );

    it('Enter en el campo de imagen la agrega y no publica; otra tecla no hace nada', () => {
      render(<PostComposer muUniverse={null} onPosted={onPosted} />);
      type('Texto listo');
      const input = screen.getByTestId('composer-image-input');
      fireEvent.change(input, { target: { value: 'https://cdn.example/a.jpg' } });
      fireEvent.keyDown(input, { key: 'a' });
      expect(screen.queryByTestId('composer-images')).toBeNull();
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(screen.getByTestId('composer-images').querySelectorAll('img')).toHaveLength(1);
      expect(createPost).not.toHaveBeenCalled();
    });

    it('celular (teclado Samsung): el «Ir» sin texto escrito llega al envío y agrega la imagen', () => {
      render(<PostComposer muUniverse={null} onPosted={onPosted} />);
      expect(screen.getByTestId('composer-image-input')).toHaveAttribute('enterkeyhint', 'done');
      const input = screen.getByTestId('composer-image-input');
      fireEvent.change(input, { target: { value: 'https://cdn.example/c.webp' } });
      input.focus();
      fireEvent.submit(screen.getByTestId('post-composer'));
      expect(screen.getByTestId('composer-images').querySelectorAll('img')).toHaveLength(1);
      expect(createPost).not.toHaveBeenCalled();
    });

    it('la lista de miniaturas no lleva viñetas del navegador', () => {
      render(<PostComposer muUniverse={null} onPosted={onPosted} />);
      addImage('https://cdn.example/a.png');
      expect(screen.getByTestId('composer-images')).toHaveClass('list-none');
    });

    it('409 DUPLICATE_POST muestra el aviso de publicación repetida', async () => {
      vi.mocked(createPost).mockRejectedValue({ response: { data: { code: 'DUPLICATE_POST' } } });
      render(<PostComposer muUniverse={null} onPosted={onPosted} />);
      type('Repetida');
      fireEvent.click(screen.getByTestId('composer-submit'));
      expect(await screen.findByTestId('composer-error')).toHaveTextContent('hace un momento');
    });
  });
});
