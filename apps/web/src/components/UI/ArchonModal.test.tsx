import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ArchonModal from './ArchonModal';

describe('ArchonModal — FC-2 UIUX FaseA', () => {
  const onClose = vi.fn();

  it('AT-UI-1: renders children when isOpen=true', () => {
    render(
      <ArchonModal isOpen={true} onClose={onClose}>
        <span>Modal Content</span>
      </ArchonModal>
    );
    expect(screen.getByText('Modal Content')).toBeDefined();
  });

  it('AT-UI-2: renders nothing when isOpen=false', () => {
    const { container } = render(
      <ArchonModal isOpen={false} onClose={onClose}>
        <span>Hidden</span>
      </ArchonModal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('AT-UI-3: backdrop has archon-modal-backdrop class', () => {
    const { baseElement } = render(
      <ArchonModal isOpen={true} onClose={onClose} ariaLabel="Test Modal">
        <div>Body</div>
      </ArchonModal>
    );
    const backdrop = baseElement.querySelector('.archon-modal-backdrop');
    expect(backdrop).not.toBeNull();
  });

  it('AT-UI-4: container has archon-modal-container class', () => {
    const { baseElement } = render(
      <ArchonModal isOpen={true} onClose={onClose}>
        <div>Body</div>
      </ArchonModal>
    );
    const container = baseElement.querySelector('.archon-modal-container');
    expect(container).not.toBeNull();
  });

  it('AT-UI-5: applies custom maxWidth prop', () => {
    const { baseElement } = render(
      <ArchonModal isOpen={true} onClose={onClose} maxWidth="max-w-xl">
        <div>Body</div>
      </ArchonModal>
    );
    const container = baseElement.querySelector('.archon-modal-container');
    expect(container?.classList.contains('max-w-xl')).toBe(true);
  });

  it('AT-UI-6: clicking backdrop calls onClose', () => {
    const { baseElement } = render(
      <ArchonModal isOpen={true} onClose={onClose}>
        <div>Body</div>
      </ArchonModal>
    );
    const backdrop = baseElement.querySelector('.archon-modal-backdrop') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('AT-UI-7: role=dialog and aria-modal attributes are set', () => {
    render(
      <ArchonModal isOpen={true} onClose={onClose} ariaLabel="Aria Test">
        <div>Body</div>
      </ArchonModal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Aria Test');
  });
});
