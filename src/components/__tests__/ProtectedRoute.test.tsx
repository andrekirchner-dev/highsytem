import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

vi.mock('../../hooks/useAuth');

import { useAuth } from '../../hooks/useAuth';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe('ProtectedRoute', () => {
  it('shows the loading spinner while auth is pending', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <Wrapper>
        <ProtectedRoute>
          <p>Conteúdo protegido</p>
        </ProtectedRoute>
      </Wrapper>
    );

    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
    // The spinner container is always rendered during loading
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects to /login when user is null and not loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <Wrapper>
        <ProtectedRoute>
          <p>Conteúdo protegido</p>
        </ProtectedRoute>
      </Wrapper>
    );

    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
  });

  it('renders children when the user is authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'abc', email: 'user@test.com' } as never,
      loading: false,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <Wrapper>
        <ProtectedRoute>
          <p>Conteúdo protegido</p>
        </ProtectedRoute>
      </Wrapper>
    );

    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
  });
});
