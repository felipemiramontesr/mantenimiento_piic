import React, { useState } from 'react';
import { AtSign, Search, UserCircle } from 'lucide-react';
import {
  describeArcsialError,
  HANDLE_PATTERN,
  InviteType,
  lookupHandle,
  normalizeHandle,
  PublicProfile,
  sendInvitation,
} from './arcsialApi';

/**
 * FC209 F3 — búsqueda por @handle EXACTO compartida por los modales de contacto y de Universo, y la
 * tarjeta pública del resultado (nombre, avatar, handle; nunca correo).
 */

export interface HandleLookupState {
  readonly input: string;
  readonly setInput: (value: string) => void;
  readonly found: PublicProfile | null;
  readonly setFound: (profile: PublicProfile | null) => void;
  readonly error: string | null;
  readonly searching: boolean;
  readonly search: () => void;
}

/** Valida el patrón antes de consultar; un correo ni siquiera sale del navegador. */
export function useHandleLookup(): HandleLookupState {
  const [inputValue, setInputValue] = useState('');
  const [found, setFound] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const setInput = (value: string): void => {
    setInputValue(value);
    setFound(null);
    setError(null);
  };
  const search = (): void => {
    const handle = normalizeHandle(inputValue);
    if (!HANDLE_PATTERN.test(handle)) {
      setError(describeArcsialError({ response: { data: { code: 'VALIDATION_ERROR' } } }));
      return;
    }
    setSearching(true);
    lookupHandle(handle)
      .then(setFound)
      .catch((err) => setError(describeArcsialError(err)))
      .finally(() => setSearching(false));
  };
  return { input: inputValue, setInput, found, setFound, error, searching, search };
}

/** Campo `@handle` + botón Buscar (Enter también busca). */
export function HandleSearchField({
  lookup,
  testId,
}: {
  readonly lookup: HandleLookupState;
  readonly testId: string;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/40" />
        <input
          value={lookup.input}
          onChange={(e): void => lookup.setInput(e.target.value)}
          onKeyDown={(e): void => {
            if (e.key === 'Enter') lookup.search();
          }}
          placeholder="handle exacto"
          aria-label="Handle exacto"
          data-testid={`${testId}-input`}
          className="archon-input pl-8"
        />
      </div>
      <button
        type="button"
        onClick={lookup.search}
        disabled={lookup.searching}
        data-testid={`${testId}-search`}
        className="btn-sentinel-sky-static text-xs disabled:opacity-50"
      >
        <Search size={12} /> Buscar
      </button>
    </div>
  );
}

export interface InvitationSender {
  readonly error: string | null;
  readonly sending: boolean;
  readonly send: (profile: PublicProfile | null) => void;
}

/** Envío de una invitación del tipo dado; al salir bien llama `onSent`, si no deja el motivo. */
export function useInvitationSender(inviteType: InviteType, onSent: () => void): InvitationSender {
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const send = (profile: PublicProfile | null): void => {
    if (!profile) return;
    setSending(true);
    setError(null);
    sendInvitation(profile.handle, inviteType)
      .then(onSent)
      .catch((err) => setError(describeArcsialError(err)))
      .finally(() => setSending(false));
  };
  return { error, sending, send };
}

/** Cancelar y enviar, al pie de los dos modales. */
export function InviteModalActions({
  canSend,
  onClose,
  onSend,
  sendLabel,
  testId,
}: {
  readonly canSend: boolean;
  readonly onClose: () => void;
  readonly onSend: () => void;
  readonly sendLabel: string;
  readonly testId: string;
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        type="button"
        onClick={onClose}
        className="text-sm font-bold text-[#0f2a44]/60 hover:text-[#0f2a44]"
      >
        Cancelar
      </button>
      <button
        type="button"
        disabled={!canSend}
        onClick={onSend}
        data-testid={`${testId}-send`}
        className="btn-sentinel-emerald w-full py-2.5 text-sm disabled:opacity-50"
      >
        {sendLabel}
      </button>
    </div>
  );
}

/** Motivo de error del modal (búsqueda o envío). */
export function ModalError({
  message,
  testId,
}: {
  readonly message: string | null;
  readonly testId: string;
}): React.JSX.Element | null {
  if (!message) return null;
  return (
    <p role="alert" data-testid={`${testId}-error`} className="text-sm font-medium text-red-500">
      {message}
    </p>
  );
}

/** Tarjeta pública de un cosmonauta. */
export function ProfilePreview({
  profile,
}: {
  readonly profile: PublicProfile;
}): React.JSX.Element {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
      data-testid="arcsial-profile-preview"
    >
      {profile.avatarUrl ? (
        <img src={profile.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <UserCircle size={40} className="text-[#0f2a44]/30" />
      )}
      <div>
        <p className="font-bold text-[#0f2a44]">{profile.displayName}</p>
        <p className="text-xs text-[#0f2a44]/50">@{profile.handle}</p>
      </div>
    </div>
  );
}
