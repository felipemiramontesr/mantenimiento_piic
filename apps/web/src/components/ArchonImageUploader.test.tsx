import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArchonImageUploader from './ArchonImageUploader';

/**
 * 🔱 Archon UI Suite: Image Uploader Tests
 * Architecture: Sovereign Registry Validation
 * Version: 1.0.0
 */

// Mock FileReader
class MockFileReader {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onload: any;

  readAsDataURL(): void {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: 'data:image/png;base64,mock' } });
      }
    }, 0);
  }
}

describe('ArchonImageUploader Component', () => {
  const mockOnChange = vi.fn();
  const mockOnFileChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('FileReader', MockFileReader);
  });

  it('should render the drop zone correctly', () => {
    render(<ArchonImageUploader images={[]} onChange={mockOnChange} />);
    expect(screen.getByText('Arrastra imágenes de la unidad')).toBeInTheDocument();
    expect(screen.getByText(/Máximo 4 fotos/i)).toBeInTheDocument();
  });

  it('should handle drag events', () => {
    render(<ArchonImageUploader images={[]} onChange={mockOnChange} />);
    const dropzone = screen.getByText('Arrastra imágenes de la unidad').closest('div');

    if (!dropzone) throw new Error('Dropzone not found');

    fireEvent.dragOver(dropzone);
    expect(screen.getByText('¡Suelta para capturar!')).toBeInTheDocument();

    fireEvent.dragLeave(dropzone);
    expect(screen.getByText('Arrastra imágenes de la unidad')).toBeInTheDocument();
  });

  it('should process dropped files', async () => {
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });
    render(
      <ArchonImageUploader images={[]} onChange={mockOnChange} onFileChange={mockOnFileChange} />
    );
    const dropzone = screen.getByText('Arrastra imágenes de la unidad').closest('div');

    if (!dropzone) throw new Error('Dropzone not found');

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(mockOnFileChange).toHaveBeenCalledWith([file]);
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  it('should process files from input change', async () => {
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });
    render(
      <ArchonImageUploader images={[]} onChange={mockOnChange} onFileChange={mockOnFileChange} />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(mockOnFileChange).toHaveBeenCalledWith([file]);
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  it('should auto-replace image if maxImages is 1', async () => {
    const file1 = new File(['1'], '1.png', { type: 'image/png' });
    const file2 = new File(['2'], '2.png', { type: 'image/png' });

    render(
      <ArchonImageUploader
        images={['already-one']}
        onChange={mockOnChange}
        onFileChange={mockOnFileChange}
        maxImages={1}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file1, file2] } });

    // Since maxImages=1, it should clear the existing and strictly pick only the first file
    expect(mockOnFileChange).toHaveBeenCalledWith([file1]);
  });

  it('should respect maxImages limit for multiple images', async () => {
    const file1 = new File(['1'], '1.png', { type: 'image/png' });
    const file2 = new File(['2'], '2.png', { type: 'image/png' });

    render(
      <ArchonImageUploader
        images={['img1', 'img2', 'img3']} // Already has 3
        onChange={mockOnChange}
        onFileChange={mockOnFileChange}
        maxImages={4}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file1, file2] } });

    // Limit is 4, already have 3, so only 1 more can be added
    expect(mockOnFileChange).toHaveBeenCalledWith([file1]);
  });

  it('should remove an image when clicking the remove button', () => {
    const images = ['img1.png', 'img2.png'];
    render(<ArchonImageUploader images={images} onChange={mockOnChange} />);

    const removeButtons = document.querySelectorAll('button');
    fireEvent.click(removeButtons[0]);

    expect(mockOnChange).toHaveBeenCalledWith(['img2.png']);
  });

  it('should render empty slots as placeholders', () => {
    const { container } = render(
      <ArchonImageUploader images={['img1.png']} onChange={mockOnChange} maxImages={4} />
    );

    // Should have 1 image + 3 empty slots = 4 slots total in the grid
    // The grid is only rendered if images.length > 0
    const slots = container.querySelectorAll('.aspect-square');
    expect(slots.length).toBe(4);
  });

  it('should render with reduced height when reducedHeight is true', () => {
    const { container } = render(
      <ArchonImageUploader images={[]} onChange={mockOnChange} reducedHeight={true} />
    );
    const dropzone = container.querySelector('.border-dashed');
    expect(dropzone).toHaveClass('p-6');
    expect(dropzone).toHaveClass('gap-2');
  });

  it('calls onFileChange when it returns a Promise and catches errors silently', async () => {
    const onFileChange = vi.fn().mockReturnValue(Promise.reject(new Error('upload failed')));
    const file = new File(['x'], 'fail.png', { type: 'image/png' });

    render(<ArchonImageUploader images={[]} onChange={mockOnChange} onFileChange={onFileChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileChange).toHaveBeenCalledWith([file]);
    // No unhandled rejection — promise is caught internally
    await waitFor(() => expect(mockOnChange).toHaveBeenCalled());
  });

  it('renders circle variant remove button when variant is circle', () => {
    render(
      <ArchonImageUploader
        images={['data:image/png;base64,abc']}
        onChange={mockOnChange}
        variant="circle"
      />
    );
    const removeButtons = document.querySelectorAll('button');
    expect(removeButtons.length).toBeGreaterThan(0);
    fireEvent.click(removeButtons[0]);
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });
});
