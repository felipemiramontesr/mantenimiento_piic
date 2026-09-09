import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UniversalDeltaEngine from './UniversalDeltaEngine';

/**
 * 🔱 Archon Test: UniversalDeltaEngine (FC166 Track D Batch D3 hotfix #2)
 * Cubre la rama "object" de `stringifyRaw` (S6551) — inalcanzable con los
 * valores string normales del WHITELIST, pero preservada defensivamente
 * para snapshots de forma inesperada.
 */
describe('UniversalDeltaEngine', () => {
  it('stringifies a non-primitive whitelisted field instead of "[object Object]" (S6551)', () => {
    render(
      <UniversalDeltaEngine
        snapshotBefore={{ destination: 'Planta A' }}
        snapshotAfter={{ destination: { unexpected: 'shape' } }}
      />
    );
    expect(screen.getByText('{"unexpected":"shape"}')).toBeInTheDocument();
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
  });

  it('renders nothing when there are no whitelisted changes', () => {
    const { container } = render(
      <UniversalDeltaEngine
        snapshotBefore={{ destination: 'Planta A' }}
        snapshotAfter={{ destination: 'Planta A' }}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
