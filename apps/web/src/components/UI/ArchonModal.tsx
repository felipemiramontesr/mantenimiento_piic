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
      role="presentation"
      onClick={handleBackdropClick}
      onKeyDown={(e: React.KeyboardEvent): void => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className={containerClassName ?? `archon-modal-container ${maxWidth}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default ArchonModal;
