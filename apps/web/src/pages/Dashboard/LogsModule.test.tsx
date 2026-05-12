import { describe, it, expect } from 'vitest';
import { render } from '../../test/testUtils';
import { SovereignLayoutProvider } from '../../context/SovereignLayoutContext';
import LogsModule from './LogsModule';

describe('LogsModule Forensics', () => {
  it('renders the logs module interface correctly', () => {
    const { container } = render(
      <SovereignLayoutProvider>
        <LogsModule />
      </SovereignLayoutProvider>
    );
    expect(container).toBeInTheDocument();
  });
});
