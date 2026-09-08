import React, { useEffect, useRef } from 'react';
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  // FC166 Track D (S6819/S6848/S1082) — click-outside/Escape are handled via
  // document-level listeners instead of onClick/onKeyDown JSX props on the
  // backdrop <div>: a div with click/key handlers but no native semantics
  // is itself a Sonar "non-native interactive element" finding, and there
  // is no role that honestly describes "click-catcher behind a dialog".
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    const handleOutsideClick = (e: MouseEvent): void => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleOutsideClick);
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="archon-modal-backdrop">
      <dialog
        ref={dialogRef}
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
