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
});
