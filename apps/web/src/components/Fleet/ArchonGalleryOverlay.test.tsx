import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArchonGalleryOverlay from './ArchonGalleryOverlay';

/**
 * 🔱 Archon UI Suite: Gallery Overlay Tests
 * Architecture: Sovereign Registry Validation
 * Version: 1.0.0
 */

describe('ArchonGalleryOverlay Component', () => {
  const mockOnClose = vi.fn();
  const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];

  it('should render the gallery with the initial image', () => {
    render(
      <ArchonGalleryOverlay
        images={images}
        initialIndex={0}
        onClose={mockOnClose}
        assetId="ASM-001"
      />
    );
    expect(screen.getByAltText('ASM-001 - 1')).toBeInTheDocument();
    expect(screen.getByText('ASM-001')).toBeInTheDocument();
  });

  it('should navigate to next image when clicking the next button', () => {
    render(
      <ArchonGalleryOverlay
        images={images}
        initialIndex={0}
        onClose={mockOnClose}
        assetId="ASM-001"
      />
    );
    // Based on DOM structure (Close, Prev, Next)

    // Better way: find by icon context or just use index if stable
    // In code: images.length > 1 && (Prev, Next)
    // So buttons are: [Close, Prev, Next]
    const buttons = document.querySelectorAll('button');
    fireEvent.click(buttons[2]); // Next
    expect(screen.getByAltText('ASM-001 - 2')).toBeInTheDocument();
  });

  it('should navigate to previous image when clicking the prev button', () => {
    render(
      <ArchonGalleryOverlay
        images={images}
        initialIndex={0}
        onClose={mockOnClose}
        assetId="ASM-001"
      />
    );
    const buttons = document.querySelectorAll('button');
    fireEvent.click(buttons[1]); // Prev
    // (0 - 1 + 3) % 3 = 2
    expect(screen.getByAltText('ASM-001 - 3')).toBeInTheDocument();
  });

  it('should close when clicking the close button', () => {
    render(<ArchonGalleryOverlay images={images} onClose={mockOnClose} assetId="ASM-001" />);
    const closeBtn = document.querySelector('.fixed.top-12.right-12');
    if (closeBtn) fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close when clicking the overlay backdrop', () => {
    render(<ArchonGalleryOverlay images={images} onClose={mockOnClose} assetId="ASM-001" />);
    const backdrop = document.querySelector('.fixed.inset-0');
    if (backdrop) fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle keyboard navigation', () => {
    render(
      <ArchonGalleryOverlay
        images={images}
        initialIndex={0}
        onClose={mockOnClose}
        assetId="ASM-001"
      />
    );

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByAltText('ASM-001 - 2')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByAltText('ASM-001 - 1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should return null if images array is empty', () => {
    const { container } = render(
      <ArchonGalleryOverlay images={[]} onClose={mockOnClose} assetId="ASM-001" />
    );
    expect(container.firstChild).toBeNull();
  });
});
