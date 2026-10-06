import { useCallback, useEffect, useState } from 'react';
import {
  fetchPlatformUsers,
  PlatformUser,
  PlatformUserScope,
  PLATFORM_USERS_PAGE_SIZE,
} from './platformUsersApi';

export interface PlatformUsersState {
  readonly users: PlatformUser[];
  readonly total: number;
  readonly loading: boolean;
  readonly error: boolean;
  readonly scope: PlatformUserScope;
  readonly setScope: (scope: PlatformUserScope) => void;
  readonly search: string;
  readonly setSearch: (search: string) => void;
  readonly page: number;
  readonly pageCount: number;
  readonly setPage: (page: number) => void;
  readonly refetch: () => void;
}

interface FetchedPage {
  readonly users: PlatformUser[];
  readonly total: number;
  readonly loading: boolean;
  readonly error: boolean;
}

/** Carga la página pedida; `epoch` fuerza una recarga (tras una acción soberana). */
function usePlatformUsersPage(
  scope: PlatformUserScope,
  search: string,
  page: number,
  epoch: number
): FetchedPage {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchPlatformUsers({ scope, search, page })
      .then((result) => {
        if (cancelled) return;
        setUsers(result.users);
        setTotal(result.total);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return (): void => {
      cancelled = true;
    };
  }, [scope, search, page, epoch]);

  return { users, total, loading, error };
}

/** FC204 F4 — datos de la consola: filtro de Universo, búsqueda y página (la tarjeta solo se monta
 *  para Ω). Cambiar el filtro o la búsqueda vuelve a la página 1. */
export default function usePlatformUsers(): PlatformUsersState {
  const [scope, setScope] = useState<PlatformUserScope>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [epoch, setEpoch] = useState(0);
  const fetched = usePlatformUsersPage(scope, search, page, epoch);

  const selectScope = useCallback((next: PlatformUserScope): void => {
    setScope(next);
    setPage(1);
  }, []);
  const applySearch = useCallback((next: string): void => {
    setSearch(next);
    setPage(1);
  }, []);
  const refetch = useCallback((): void => setEpoch((e) => e + 1), []);
  const pageCount = Math.max(1, Math.ceil(fetched.total / PLATFORM_USERS_PAGE_SIZE));

  return {
    ...fetched,
    scope,
    setScope: selectScope,
    search,
    setSearch: applySearch,
    page,
    pageCount,
    setPage,
    refetch,
  };
}
