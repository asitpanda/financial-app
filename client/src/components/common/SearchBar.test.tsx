import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SearchBar from './SearchBar';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('SearchBar', () => {
  it('renders its value and custom placeholder', () => {
    renderWithProviders(<SearchBar value="checking" onChange={() => undefined} placeholder="Find account" />);

    expect(screen.getByPlaceholderText('Find account')).toHaveValue('checking');
  });

  it('reports the updated search value', () => {
    const onChange = vi.fn();
    renderWithProviders(<SearchBar value="" onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'investment' } });

    expect(onChange).toHaveBeenCalledWith('investment');
  });
});
