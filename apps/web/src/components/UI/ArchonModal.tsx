import React from 'react';
import { createPortal } from 'react-dom';

export interface ArchonModalProps {
  isOpen: boolean;
  onClose(): void;
  children: React.ReactNode;
  maxWidth?: string;
  ariaLabel?: string;
}

const ArchonModal: React.FC<ArchonModalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
  ariaLabel,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div
      className="archon-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={handleBackdropClick}
    >
      <div className={`archon-modal-container ${maxWidth}`}>{children}</div>
    </div>,
    document.body
  );
};

export default ArchonModal;
