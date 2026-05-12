import { describe, it, expect } from 'vitest';
import { render } from '../../test/testUtils';
import { SovereignLayoutProvider } from '../../context/SovereignLayoutContext';
import SettingsModule from './SettingsModule';

describe('SettingsModule Configurations', () => {
  it('renders the settings module interface correctly', () => {
    const { container } = render(
      <SovereignLayoutProvider>
        <SettingsModule />
      </SovereignLayoutProvider>
    );
    expect(container).toBeInTheDocument();
  });
});
