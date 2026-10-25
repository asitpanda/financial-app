import { describe, expect, it } from 'vitest';
import SectionCard from './SectionCard';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('SectionCard', () => {
  it('renders its heading, subtitle, action, and content', () => {
    renderWithProviders(
      <SectionCard title="Accounts" subtitle="Your linked accounts" action={<button type="button">Add</button>}>
        <span>Checking account</span>
      </SectionCard>,
    );

    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.getByText('Your linked accounts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByText('Checking account')).toBeInTheDocument();
  });

  it('renders EmptyState instead of children when empty', () => {
    renderWithProviders(
      <SectionCard empty emptyState={{ title: 'No transactions' }}>
        <span>Should not render</span>
      </SectionCard>,
    );

    expect(screen.getByText('No transactions')).toBeInTheDocument();
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });
});
