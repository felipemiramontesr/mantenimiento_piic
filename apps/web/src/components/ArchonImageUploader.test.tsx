import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArchonImageUploader from './ArchonImageUploader';

// Auto-confirm (or auto-cancel, per cropModalBehavior) the crop modal so uploader
// unit tests focus on file-handling logic, not on the crop UI interaction (covered
// in ArchonCropModal.test.tsx).
const cropModalBehavior = vi.hoisted(() => ({
  action: 'confirm' as 'confirm' | 'cancel',
  renderCount: 0,
}));
vi.mock('./ArchonCropModal', () => ({
  default: ({
    onConfirm,
    onCancel,
  }: {
    onConfirm: (url: string) => void;
    onCancel: () => void;
  }): null => {
    cropModalBehavior.renderCount += 1;
    if (cropModalBehavior.action === 'cancel') {
      onCancel();
    } else {
      onConfirm('data:image/jpeg;base64,mock-cropped');
    }
    return null;
  },
}));

// Mock FileReader — mockFileReaderResult lets individual tests simulate a
// falsy/empty result (e.g. readFileAsDataUrl's `if (dataUrl)` false side).
let mockFileReaderResult = 'data:image/png;base64,mock';
class MockFileReader {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onload: any;

  readAsDataURL(): void {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: mockFileReaderResult } });
      }
    }, 0);
  }
}

describe('ArchonImageUploader Component', () => {
  const mockOnChange = vi.fn();
  const mockOnFileChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFileReaderResult = 'data:image/png;base64,mock';
    vi.stubGlobal('FileReader', MockFileReader);
    cropModalBehavior.action = 'confirm';
    cropModalBehavior.renderCount = 0;
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

    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const dropZone = container.querySelector('.border-dashed') as HTMLElement;
    fireEvent.click(dropZone);
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('catches errors silently when onFileChange returns a Promise with maxImages=1', async () => {
    const onFileChange = vi.fn().mockReturnValue(Promise.reject(new Error('upload failed')));
    const file = new File(['x'], 'fail.png', { type: 'image/png' });

    render(
      <ArchonImageUploader
        images={[]}
        onChange={mockOnChange}
        onFileChange={onFileChange}
        maxImages={1}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileChange).toHaveBeenCalledWith([file]);
    await waitFor(() => expect(mockOnChange).toHaveBeenCalled());
  });

  it('removes the crop entry from the queue when the crop modal is cancelled', async () => {
    cropModalBehavior.action = 'cancel';
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });

    render(<ArchonImageUploader images={[]} onChange={mockOnChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(cropModalBehavior.renderCount).toBeGreaterThan(0));
    expect(mockOnChange).not.toHaveBeenCalled();
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

  it('pressing Enter on the dropzone triggers file input click (DropzoneTrigger keyboard path, FC163 F1-REG Gate3)', () => {
    const { container } = render(<ArchonImageUploader images={[]} onChange={mockOnChange} />);
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const dropZone = container.querySelector('.border-dashed') as HTMLElement;
    fireEvent.keyDown(dropZone, { key: 'Enter' });
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  // ── R4-C Fc165 F2 Slice 2.3C Batch 1 — ArchonImageUploader/DropzoneTrigger unc branches ──

  it('does not enqueue a crop when the FileReader result is empty (readFileAsDataUrl falsy guard)', async () => {
    mockFileReaderResult = '';
    const file = new File(['x'], 'x.png', { type: 'image/png' });
    render(<ArchonImageUploader images={[]} onChange={mockOnChange} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await new Promise((r) => {
      setTimeout(r, 10);
    });
    expect(cropModalBehavior.renderCount).toBe(0);
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('selecting only non-image files with maxImages=1 is a no-op (filesArray.length===0 guard)', () => {
    const nonImageFile = new File(['x'], 'x.txt', { type: 'text/plain' });
    render(
      <ArchonImageUploader
        images={[]}
        onChange={mockOnChange}
        onFileChange={mockOnFileChange}
        maxImages={1}
      />
    );
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [nonImageFile] } });
    expect(mockOnFileChange).not.toHaveBeenCalled();
    expect(cropModalBehavior.renderCount).toBe(0);
  });

  it('dropping with no files on the DataTransfer is a no-op (onDrop dataTransfer.files guard)', () => {
    render(
      <ArchonImageUploader images={[]} onChange={mockOnChange} onFileChange={mockOnFileChange} />
    );
    const dropzone = screen.getByText('Arrastra imágenes de la unidad').closest('div');
    if (!dropzone) throw new Error('Dropzone not found');
    fireEvent.drop(dropzone, { dataTransfer: {} });
    expect(mockOnFileChange).not.toHaveBeenCalled();
  });

  it('input change event with no FileList is a no-op (DropzoneFileInput onChange guard)', () => {
    render(
      <ArchonImageUploader images={[]} onChange={mockOnChange} onFileChange={mockOnFileChange} />
    );
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: null } });
    expect(mockOnFileChange).not.toHaveBeenCalled();
  });

  it('pressing Enter/Space while disabled does not open the file dialog (handleKeyDown disabled guard)', () => {
    const { container } = render(
      <ArchonImageUploader images={[]} onChange={mockOnChange} disabled />
    );
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const dropZone = container.querySelector('.border-dashed') as HTMLElement;
    fireEvent.keyDown(dropZone, { key: 'Enter' });
    expect(clickSpy).not.toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('pressing Space on the dropzone triggers file input click (handleKeyDown Space path)', () => {
    const { container } = render(<ArchonImageUploader images={[]} onChange={mockOnChange} />);
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const dropZone = container.querySelector('.border-dashed') as HTMLElement;
    fireEvent.keyDown(dropZone, { key: ' ' });
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('pressing an unrelated key on the dropzone does not trigger the file dialog', () => {
    const { container } = render(<ArchonImageUploader images={[]} onChange={mockOnChange} />);
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const dropZone = container.querySelector('.border-dashed') as HTMLElement;
    fireEvent.keyDown(dropZone, { key: 'a' });
    expect(clickSpy).not.toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
