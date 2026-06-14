import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArchonImageUploader from './ArchonImageUploader';

// Auto-confirm crop modal so uploader unit tests focus on file-handling logic,
// not on the crop UI interaction (covered in ArchonCropModal.test.tsx)
vi.mock('./ArchonCropModal', () => ({
  default: ({ onConfirm }: { onConfirm: (url: string) => void }): null => {
    onConfirm('data:image/jpeg;base64,mock-cropped');
    return null;
  },
}));

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

  it('should call onFileChange and then onChange (via crop confirm) on drop', async () => {
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });
    render(
      <ArchonImageUploader images={[]} onChange={mockOnChange} onFileChange={mockOnFileChange} />
    );
    const dropzone = screen.getByText('Arrastra imágenes de la unidad').closest('div');

    if (!dropzone) throw new Error('Dropzone not found');

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    expect(mockOnFileChange).toHaveBeenCalledWith([file]);
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  it('should call onFileChange and then onChange (via crop confirm) on input change', async () => {
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

    // maxImages=1 → only first file, replaces existing
    expect(mockOnFileChange).toHaveBeenCalledWith([file1]);
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(['data:image/jpeg;base64,mock-cropped']);
    });
  });

  it('should respect maxImages limit for multiple images', async () => {
    const file1 = new File(['1'], '1.png', { type: 'image/png' });
    const file2 = new File(['2'], '2.png', { type: 'image/png' });

    render(
      <ArchonImageUploader
        images={['img1', 'img2', 'img3']}
        onChange={mockOnChange}
        onFileChange={mockOnFileChange}
        maxImages={4}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file1, file2] } });

    // 3 already, limit 4 → only 1 more
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

  it('disabled=true sets all drag/click handlers to undefined (drop zone is inert)', () => {
    render(<ArchonImageUploader images={[]} onChange={mockOnChange} disabled={true} />);
    const dropzone = screen.getByText('Arrastra imágenes de la unidad').closest('div');
    if (!dropzone) throw new Error('Dropzone not found');
    fireEvent.dragOver(dropzone);
    expect(screen.queryByText('¡Suelta para capturar!')).toBeNull();
    fireEvent.drop(dropzone, { dataTransfer: { files: [] } });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should disable drop zone when at max capacity', () => {
    render(
      <ArchonImageUploader images={['a', 'b', 'c', 'd']} onChange={mockOnChange} maxImages={4} />
    );
    const dropzone = screen.getByText('Arrastra imágenes de la unidad').closest('div');
    if (!dropzone) throw new Error('Dropzone not found');
    fireEvent.dragOver(dropzone);
    expect(screen.queryByText('¡Suelta para capturar!')).toBeNull();
  });

  it('should show "alcanzado" text when at max capacity', () => {
    render(
      <ArchonImageUploader images={['a', 'b', 'c', 'd']} onChange={mockOnChange} maxImages={4} />
    );
    expect(screen.getByText(/alcanzado/i)).toBeInTheDocument();
  });

  it('clicking the dropzone div triggers file input click', () => {
    const { container } = render(<ArchonImageUploader images={[]} onChange={mockOnChange} />);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const dropZone = container.querySelector('.border-dashed') as HTMLElement;
    fireEvent.click(dropZone);
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('preview grid uses gap-2 when compact=true', () => {
    const { container } = render(
      <ArchonImageUploader
        images={['data:image/png;base64,abc']}
        onChange={mockOnChange}
        compact={true}
      />
    );
    const grid = container.querySelector('.grid-cols-4');
    expect(grid?.className).toContain('gap-2');
  });
});
