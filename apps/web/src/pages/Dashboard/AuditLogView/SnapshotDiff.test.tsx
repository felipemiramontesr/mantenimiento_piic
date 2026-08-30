import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SnapshotDiff from './SnapshotDiff';

describe('SnapshotDiff', () => {
  it('shows the no-data message when both snapshots are null and onlyDiffs is off', () => {
    render(<SnapshotDiff before={null} after={null} onlyDiffs={false} />);
    expect(screen.getByText('Sin datos de snapshot.')).toBeInTheDocument();
  });

  it('shows the no-diffs message when both snapshots are null and onlyDiffs is on', () => {
    render(<SnapshotDiff before={null} after={null} onlyDiffs />);
    expect(screen.getByText('Sin diferencias detectadas.')).toBeInTheDocument();
  });

  it('uses the neutral (unchanged) style for a key whose value is identical in both snapshots', () => {
    render(
      <SnapshotDiff
        before={{ estado: 'ACTIVO', odometro: 100 }}
        after={{ estado: 'ACTIVO', odometro: 200 }}
        onlyDiffs={false}
      />
    );
    expect(screen.getAllByText(/"ACTIVO"/)).toHaveLength(2);
  });

  it('falls back before to {} when before is null, rendering "null" for its side', () => {
    render(<SnapshotDiff before={null} after={{ placas: 'ABC-123' }} onlyDiffs />);
    expect(screen.getByText(/null/)).toBeInTheDocument();
    expect(screen.getByText(/"ABC-123"/)).toBeInTheDocument();
  });

  it('falls back after to {} when after is null, rendering "null" for its side', () => {
    render(<SnapshotDiff before={{ placas: 'ABC-123' }} after={null} onlyDiffs />);
    expect(screen.getByText(/"ABC-123"/)).toBeInTheDocument();
    expect(screen.getByText(/null/)).toBeInTheDocument();
  });
});
