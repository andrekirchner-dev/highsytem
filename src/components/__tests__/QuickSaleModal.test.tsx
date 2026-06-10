import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickSaleModal from '../QuickSaleModal';

vi.mock('../../hooks/useAuth');
vi.mock('../../lib/firestore');

import { useAuth } from '../../hooks/useAuth';
import { subscribeProducts, createSale } from '../../lib/firestore';

const mockProducts = [
  {
    id: 'p1',
    name: 'Narguilé Premium',
    category: 'Narguilés',
    brand: 'Marca A',
    sku: 'NRG-001',
    costPrice: 80,
    salePrice: 150,
    stockQty: 10,
    minStock: 2,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'p2',
    name: 'Cigarro de Bali',
    category: 'Cigarros',
    brand: 'Marca B',
    costPrice: 5,
    salePrice: 12,
    stockQty: 0, // out of stock
    minStock: 5,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'p3',
    name: 'Tabaco Virginia',
    category: 'Tabaco',
    brand: 'Marca C',
    costPrice: 15,
    salePrice: 35,
    stockQty: 20,
    minStock: 3,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(useAuth).mockReturnValue({
    user: { uid: 'user-test', email: 'test@test.com' } as never,
    loading: false,
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  });

  vi.mocked(subscribeProducts).mockImplementation((cb) => {
    cb(mockProducts);
    return vi.fn();
  });

  vi.mocked(createSale).mockResolvedValue('sale-123');
});

function renderModal() {
  const onClose = vi.fn();
  render(<QuickSaleModal onClose={onClose} />);
  return { onClose };
}

describe('QuickSaleModal — rendering', () => {
  it('renders the search input and heading', () => {
    renderModal();
    expect(screen.getByText('Realizar venda')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/buscar produto/i)).toBeInTheDocument();
  });

  it('shows an empty cart message initially', () => {
    renderModal();
    expect(screen.getByText(/busque um produto/i)).toBeInTheDocument();
  });

  it('"Finalizar" button is disabled when cart is empty', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /finalizar/i })).toBeDisabled();
  });
});

describe('QuickSaleModal — product search', () => {
  it('shows matching products when typing in the search box', async () => {
    renderModal();
    const input = screen.getByPlaceholderText(/buscar produto/i);
    await userEvent.type(input, 'Narg');
    expect(screen.getByText('Narguilé Premium')).toBeInTheDocument();
  });

  it('shows results case-insensitively', async () => {
    renderModal();
    const input = screen.getByPlaceholderText(/buscar produto/i);
    await userEvent.type(input, 'narg');
    expect(screen.getByText('Narguilé Premium')).toBeInTheDocument();
  });

  it('shows out-of-stock product as disabled', async () => {
    renderModal();
    const input = screen.getByPlaceholderText(/buscar produto/i);
    await userEvent.type(input, 'bali');
    const button = screen.getByRole('button', { name: /cigarro de bali/i });
    expect(button).toBeDisabled();
  });
});

describe('QuickSaleModal — cart operations', () => {
  it('adds a product to the cart on click', async () => {
    renderModal();
    const input = screen.getByPlaceholderText(/buscar produto/i);
    await userEvent.type(input, 'Narg');
    fireEvent.click(screen.getByText('Narguilé Premium'));
    expect(screen.getByText(/narguilé premium/i)).toBeInTheDocument();
  });

  it('does not add an out-of-stock product', async () => {
    renderModal();
    const input = screen.getByPlaceholderText(/buscar produto/i);
    await userEvent.type(input, 'bali');
    fireEvent.click(screen.getByText('Cigarro de Bali'));
    expect(screen.getByText(/busque um produto/i)).toBeInTheDocument();
  });

  it('updates the total when a product is added', async () => {
    renderModal();
    const input = screen.getByPlaceholderText(/buscar produto/i);
    await userEvent.type(input, 'virginia');
    await userEvent.click(screen.getByText('Tabaco Virginia'));
    // R$ 35,00 appears in the total section (there may also be one in the cart row)
    const totals = screen.getAllByText('R$ 35,00');
    expect(totals.length).toBeGreaterThan(0);
  });

  it('removes a product when the minus button reduces qty to 0', async () => {
    renderModal();
    const input = screen.getByPlaceholderText(/buscar produto/i);
    await userEvent.type(input, 'virginia');
    await userEvent.click(screen.getByText('Tabaco Virginia'));

    // Cart has one item with qty=1. Click minus once → qty hits 0 → item removed.
    // The minus button is inside the cart item area; at this point there is exactly one
    // minus-icon button visible.
    const minusBtns = screen.getAllByRole('button').filter(
      btn => btn.querySelector('svg') && btn.closest('[class*="scrollbar-thin"]')
    );
    await userEvent.click(minusBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/busque um produto/i)).toBeInTheDocument();
    });
  });
});

describe('QuickSaleModal — payment methods', () => {
  it('renders all four payment options', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /dinheiro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pix/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /débito/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crédito/i })).toBeInTheDocument();
  });

  it('highlights the selected payment method', () => {
    renderModal();
    const pixBtn = screen.getByRole('button', { name: /pix/i });
    // Default is PIX — should have the active class
    expect(pixBtn.className).toContain('text-primary');
  });

  it('switches the active payment method on click', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /dinheiro/i }));
    const dinheiroBtn = screen.getByRole('button', { name: /dinheiro/i });
    expect(dinheiroBtn.className).toContain('text-primary');
  });
});

describe('QuickSaleModal — finalization', () => {
  it('calls createSale with the correct arguments on finalize', async () => {
    renderModal();
    const input = screen.getByPlaceholderText(/buscar produto/i);
    await userEvent.type(input, 'virginia');
    fireEvent.click(screen.getByText('Tabaco Virginia'));

    fireEvent.click(screen.getByRole('button', { name: /finalizar/i }));

    await waitFor(() => {
      expect(createSale).toHaveBeenCalledOnce();
    });
    const [cartArg, paymentArg, userArg] = vi.mocked(createSale).mock.calls[0];
    expect(cartArg[0].product.id).toBe('p3');
    expect(paymentArg).toBe('pix');
    expect(userArg).toBe('user-test');
  });

  it('shows the success state after a successful sale', async () => {
    renderModal();

    const input = screen.getByPlaceholderText(/buscar produto/i);
    await userEvent.type(input, 'virginia');
    await userEvent.click(screen.getByText('Tabaco Virginia'));
    await userEvent.click(screen.getByRole('button', { name: /finalizar/i }));

    await waitFor(() => {
      expect(screen.getByText('Venda registrada!')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('calls window.alert when createSale rejects', async () => {
    vi.mocked(createSale).mockRejectedValueOnce(new Error('Estoque insuficiente'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderModal();
    const input = screen.getByPlaceholderText(/buscar produto/i);
    await userEvent.type(input, 'virginia');
    await userEvent.click(screen.getByText('Tabaco Virginia'));
    await userEvent.click(screen.getByRole('button', { name: /finalizar/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Estoque insuficiente');
    }, { timeout: 3000 });

    alertSpy.mockRestore();
  });
});
