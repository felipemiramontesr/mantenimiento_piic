import { useEffect } from 'react';

/** Sincroniza el término de búsqueda del layout con `?categoria=`/`?status=`
 * de la URL — extraído de `FleetModule` para mantenerlo bajo el presupuesto
 * de Gate2 (FC165 F3 Slice3.1 Batch2, Dual-Gate Isolation). */
export default function useFleetModuleUrlSearch(
  locationSearch: string,
  setSearchTerm: (v: string) => void
): void {
  useEffect((): (() => void) => {
    const params = new URLSearchParams(locationSearch);
    const categoria = params.get('categoria');
    const status = params.get('status');
    if (categoria) setSearchTerm(categoria);
    else if (status) setSearchTerm(status);
    else setSearchTerm('');
    return (): void => setSearchTerm('');
  }, [locationSearch, setSearchTerm]);
}
