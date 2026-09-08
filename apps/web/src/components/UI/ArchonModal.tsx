import React from 'react';
import { createPortal } from 'react-dom';

export interface ArchonModalProps {
  isOpen: boolean;
  onClose(): void;
  children: React.ReactNode;
  maxWidth?: string;
  ariaLabel?: string;
  containerClassName?: string;
}

const ArchonModal: React.FC<ArchonModalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
  ariaLabel,
  containerClassName,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div
      className="archon-modal-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={(e: React.KeyboardEvent): void => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <dialog
        open
        // A bare <dialog open> (no showModal()) still inherits the UA
        // stylesheet's `position: absolute; inset-block-start: 0; margin:
        // auto` — with Preflight disabled project-wide (tailwind.config.js)
        // and neither containerClassName path (default or ArchonCropModal's
        // custom one) resetting these, the modal would pin to the top of
        // the backdrop instead of the flex-centered position the original
        // plain <div> had. Reset inline (highest precedence, applies
        // regardless of which className is used) — padding/border/
        // background stay owned by each caller's className, unchanged.
        style={{ position: 'static', margin: 0, inset: 'auto' }}
        className={containerClassName ?? `archon-modal-container ${maxWidth}`}
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {children}
      </dialog>
    </div>,
    document.body
  );
};

export default ArchonModal;
