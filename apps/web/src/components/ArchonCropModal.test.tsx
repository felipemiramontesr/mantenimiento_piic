import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArchonCropModal from './ArchonCropModal';

// jsdom does not implement canvas — provide minimal stubs
beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: (): { drawImage: () => void } => ({ drawImage: vi.fn() }),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    value: (): string => 'data:image/jpeg;base64,cropped-mock',
  });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { get: (): number => 800 });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', { get: (): number => 600 });
});

const defaultProps = {
  imageSrc: 'data:image/png;base64,test',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('ArchonCropModal', () => {
  it('renders the modal with the preview image', () => {
    render(<ArchonCropModal {...defaultProps} />);
    expect(screen.getByTestId('archon-crop-modal')).toBeInTheDocument();
    expect(screen.getByAltText('crop-preview')).toBeInTheDocument();
    expect(screen.getByText('Encuadrar foto')).toBeInTheDocument();
  });

  it('calls onCancel when the X button is clicked', () => {
    const onCancel = vi.fn();
    render(<ArchonCropModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByTitle('Cancelar'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onConfirm with a data URL when Confirmar is clicked', () => {
    const onConfirm = vi.fn();
    render(<ArchonCropModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId('crop-confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith('data:image/jpeg;base64,cropped-mock');
  });

  it('zoom-in button is present and clickable', () => {
    render(<ArchonCropModal {...defaultProps} />);
    const zoomIn = screen.getByTitle('Acercar');
    expect(zoomIn).toBeInTheDocument();
    fireEvent.click(zoomIn); // Should not throw
  });

  it('zoom-out button is present and clickable', () => {
    render(<ArchonCropModal {...defaultProps} />);
    const zoomOut = screen.getByTitle('Alejar');
    expect(zoomOut).toBeInTheDocument();
    fireEvent.click(zoomOut); // Should not throw
  });

  it('updates image position on mouse drag', () => {
    render(<ArchonCropModal {...defaultProps} />);
    const viewport = screen.getByTestId('crop-viewport');
    fireEvent.mouseDown(viewport, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 150, clientY: 130 });
    fireEvent.mouseUp(window);
    // Offset changed — image is still rendered (no crash)
    expect(screen.getByAltText('crop-preview')).toBeInTheDocument();
  });

  // ── R4-C Fc162 — Sonar unc lines 65-72,89-92 ──
  it('computes natural size and centers the offset when the preview image loads', () => {
    render(<ArchonCropModal {...defaultProps} />);
    const img = screen.getByAltText('crop-preview') as HTMLImageElement;
    fireEvent.load(img);
    // naturalWidth/naturalHeight mocked to 800x600 — scale/offset must reflect them.
    expect(parseFloat(img.style.width)).toBeGreaterThan(100);
    expect(parseFloat(img.style.height)).toBeGreaterThan(100);
  });

  it('scrolling the mouse wheel over the viewport adjusts the zoom', () => {
    render(<ArchonCropModal {...defaultProps} />);
    const viewport = screen.getByTestId('crop-viewport');
    const img = screen.getByAltText('crop-preview') as HTMLImageElement;
    fireEvent.load(img);
    const widthBeforeZoom = parseFloat(img.style.width);

    fireEvent.wheel(viewport, { deltaY: -100 });
    expect(parseFloat(img.style.width)).toBeGreaterThan(widthBeforeZoom);
  });

  /**
   * FC163 F2B2 (S6848 — el viewport de encuadre no es un elemento nativo) — role/aria-label/
   * tabIndex y el equivalente de teclado (flechas para pan, +/- para zoom) del arrastre/rueda
   * con mouse.
   */
  describe('keyboard equivalent of drag-to-pan and wheel-to-zoom (FC163 F2B2, S6848)', () => {
    it('the viewport exposes role, aria-label, tabIndex and aria-value* for keyboard/AT users', () => {
      render(<ArchonCropModal {...defaultProps} />);
      const viewport = screen.getByTestId('crop-viewport');
      const img = screen.getByAltText('crop-preview') as HTMLImageElement;
      fireEvent.load(img);
      // role=slider (FC163 F2B5, S6845/235_AN+236_AN) -- "application" no desciende de
      // "widget" en aria-query y nunca satisface no-noninteractive-tabindex; "slider" sí.
      expect(viewport).toHaveAttribute('role', 'slider');
      expect(viewport).toHaveAttribute('aria-label');
      expect(viewport).toHaveAttribute('tabindex', '0');
      // Justo tras cargar, scale === minScale -> 100% del rango real [minScale, minScale*4].
      expect(viewport).toHaveAttribute('aria-valuenow', '100');
      expect(viewport).toHaveAttribute('aria-valuemin', '100');
      expect(viewport).toHaveAttribute('aria-valuemax', '400');
    });

    it('aria-valuenow tracks the zoom level as it changes', () => {
      render(<ArchonCropModal {...defaultProps} />);
      const viewport = screen.getByTestId('crop-viewport');
      const img = screen.getByAltText('crop-preview') as HTMLImageElement;
      fireEvent.load(img);
      expect(viewport).toHaveAttribute('aria-valuenow', '100');

      fireEvent.keyDown(viewport, { key: '+' });
      const valueAfterZoomIn = Number(viewport.getAttribute('aria-valuenow'));
      expect(valueAfterZoomIn).toBeGreaterThan(100);

      fireEvent.keyDown(viewport, { key: '-' });
      fireEvent.keyDown(viewport, { key: '-' });
      const valueAfterZoomOut = Number(viewport.getAttribute('aria-valuenow'));
      expect(valueAfterZoomOut).toBeLessThan(valueAfterZoomIn);
    });

    it('ArrowRight pans the image (same direction as dragging right)', () => {
      render(<ArchonCropModal {...defaultProps} />);
      const viewport = screen.getByTestId('crop-viewport');
      const img = screen.getByAltText('crop-preview') as HTMLImageElement;
      fireEvent.load(img);
      const leftBefore = parseFloat(img.style.left);

      fireEvent.keyDown(viewport, { key: 'ArrowRight' });
      expect(parseFloat(img.style.left)).toBeGreaterThan(leftBefore);
    });

    it('ArrowLeft/Up/Down also pan the image without throwing', () => {
      render(<ArchonCropModal {...defaultProps} />);
      const viewport = screen.getByTestId('crop-viewport');
      const img = screen.getByAltText('crop-preview') as HTMLImageElement;
      fireEvent.load(img);

      fireEvent.keyDown(viewport, { key: 'ArrowLeft' });
      fireEvent.keyDown(viewport, { key: 'ArrowUp' });
      fireEvent.keyDown(viewport, { key: 'ArrowDown' });
      expect(screen.getByAltText('crop-preview')).toBeInTheDocument();
    });

    it('+ and = zoom in, - zooms out', () => {
      render(<ArchonCropModal {...defaultProps} />);
      const viewport = screen.getByTestId('crop-viewport');
      const img = screen.getByAltText('crop-preview') as HTMLImageElement;
      fireEvent.load(img);
      const widthBeforeZoom = parseFloat(img.style.width);

      fireEvent.keyDown(viewport, { key: '+' });
      expect(parseFloat(img.style.width)).toBeGreaterThan(widthBeforeZoom);

      const widthAfterPlus = parseFloat(img.style.width);
      fireEvent.keyDown(viewport, { key: '-' });
      expect(parseFloat(img.style.width)).toBeLessThan(widthAfterPlus);
    });

    it('an unrelated key is a no-op', () => {
      render(<ArchonCropModal {...defaultProps} />);
      const viewport = screen.getByTestId('crop-viewport');
      const img = screen.getByAltText('crop-preview') as HTMLImageElement;
      fireEvent.load(img);
      const leftBefore = img.style.left;

      fireEvent.keyDown(viewport, { key: 'a' });
      expect(img.style.left).toBe(leftBefore);
    });
  });
});
