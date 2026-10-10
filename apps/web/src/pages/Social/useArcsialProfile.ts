import { useCallback, useEffect, useState } from 'react';
import {
  BlockedUser,
  Contact,
  describeArcsialError,
  fetchBlocks,
  fetchContacts,
  fetchOwnProfile,
  OwnProfile,
} from './arcsialApi';

/** FC209 F3 — perfil propio, contactos y bloqueados de la sesión, con recarga. */
export interface ArcsialProfileState {
  readonly profile: OwnProfile | null;
  readonly contacts: Contact[];
  readonly blocks: BlockedUser[];
  readonly error: string | null;
  readonly reload: () => void;
}

/** Carga las tres lecturas propias en paralelo; un fallo deja el motivo y lo ya cargado. */
export default function useArcsialProfile(): ArcsialProfileState {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [blocks, setBlocks] = useState<BlockedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback((): void => {
    setError(null);
    Promise.all([fetchOwnProfile(), fetchContacts(), fetchBlocks()])
      .then(([own, list, blocked]) => {
        setProfile(own);
        setContacts(list);
        setBlocks(blocked);
      })
      .catch((err) => setError(describeArcsialError(err)));
  }, []);
  useEffect(reload, [reload]);
  return { profile, contacts, blocks, error, reload };
}
