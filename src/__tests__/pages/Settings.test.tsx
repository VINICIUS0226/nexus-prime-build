import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settings from '../../pages/Settings';
import { PRESET_COLORS } from '../../hooks/useTheme';

// ---------------------------------------------------------------------
// 1. MOCKS (Simulações)
// ---------------------------------------------------------------------

// Mock com sucesso garantido
const mockSaveConfig = jest.fn().mockResolvedValue({ success: true });
const mockSaveTheme = jest.fn().mockResolvedValue({ success: true });

// Mock do hook useStoreConfig
const mockConfigData = {
  store_name: 'Loja Teste',
  store_phone: '11999999999',
  store_email: 'teste@loja.com',
  store_address: 'Rua Teste, 123',
  store_cnpj: '00.000.000/0001-00',
  store_logo_url: '',
};

jest.mock('@/hooks/useStoreConfig', () => ({
  useStoreConfig: () => ({
    config: mockConfigData,
    loading: false,
    saving: false,
    saveConfig: mockSaveConfig,
    refetch: jest.fn(),
  }),
}));

// Mock do hook useTheme
const mockThemeData = {
  theme_mode: 'light',
  primary_color: '0 100% 71%',
};

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: mockThemeData,
    loading: false,
    saveTheme: mockSaveTheme,
  }),
  PRESET_COLORS: [
    { primary: '0 100% 71%', name: 'Coral' },
    { primary: '238 85% 64%', name: 'Violeta' },
    { primary: '197 78% 54%', name: 'Azul' },
  ],
}));

// Mock do Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          maybeSingle: jest.fn(),
        })),
        in: jest.fn(() => ({ data: [], error: null })),
        upsert: jest.fn(() => ({ select: jest.fn() })),
      })),
      upsert: jest.fn(() => ({ select: jest.fn() })),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: '' } })),
      })),
    },
  },
}));

// Outros Mocks
jest.mock('@/components/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout-content">{children}</div>,
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// ---------------------------------------------------------------------
// 2. TESTES
// ---------------------------------------------------------------------

describe('Página de Configurações (Settings)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Deve renderizar a página corretamente com os dados iniciais carregados', () => {
    render(<Settings />);
    // [CORREÇÃO] Adicionado o hífen em E-mail para bater com o label da tela
    expect(screen.getByLabelText(/Nome/i)).toHaveValue(mockConfigData.store_name);
    expect(screen.getByLabelText(/E-mail/i)).toHaveValue(mockConfigData.store_email);
    expect(screen.getByLabelText(/CNPJ/i)).toHaveValue(mockConfigData.store_cnpj);
  });

  // TESTE 1: Formulário de Dados
  describe('Formulário de Dados da Loja (Parametrizado)', () => {
    const camposParaTestar = [
      { label: /Nome/i, novoValor: 'Nova Loja 2026', campoInterno: 'store_name' },
      { label: /Telefone/i, novoValor: '5551988888888', campoInterno: 'store_phone' },
      // [CORREÇÃO] Regex com hífen
      { label: /E-mail/i, novoValor: 'novo@email.com', campoInterno: 'store_email' },
      { label: /Endereço/i, novoValor: 'Av. Paulista, 1000', campoInterno: 'store_address' },
      { label: /CNPJ/i, novoValor: '11.222.333/0001-99', campoInterno: 'store_cnpj' },
    ];

    it.each(camposParaTestar)(
      'Deve atualizar o campo "$campoInterno" e permitir salvar',
      async ({ label, novoValor, campoInterno }) => {
        render(<Settings />);
        const input = screen.getByLabelText(label);
        fireEvent.change(input, { target: { value: novoValor } });
        expect(input).toHaveValue(novoValor);

        const saveButton = screen.getByRole('button', { name: /Salvar Configurações/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(mockSaveConfig).toHaveBeenCalledWith(
            expect.objectContaining({
              [campoInterno]: novoValor,
            })
          );
        });
      }
    );
  });

  // TESTE 2: Cores do Tema
  describe('Configuração de Aparência - Cores (Parametrizado)', () => {
    const coresTeste = [
      { nomeCor: 'Coral', valorHsl: '0 100% 71%' },
      { nomeCor: 'Violeta', valorHsl: '238 85% 64%' },
      { nomeCor: 'Azul', valorHsl: '197 78% 54%' },
    ];

    it.each(coresTeste)(
      'Deve selecionar a cor "$nomeCor" e chamar a função de salvar tema corretamente',
      async ({ nomeCor, valorHsl }) => {
        render(<Settings />);
        
        // [CORREÇÃO] Agora buscamos o botão pelo NOME (texto) que está dentro dele
        // Ex: O botão tem um <span>Coral</span> dentro, então isso funciona perfeitamente
        const botaoCor = screen.getByRole('button', { name: nomeCor });
        
        fireEvent.click(botaoCor);
        
        // Clica em salvar tema
        const saveThemeButton = screen.getByRole('button', { name: /Salvar Tema/i });
        fireEvent.click(saveThemeButton);

        await waitFor(() => {
            expect(mockSaveTheme).toHaveBeenCalledWith(
                expect.objectContaining({
                    primary_color: valorHsl
                })
            );
        });
      }
    );
  });

  // TESTE 3: Modos (Claro/Escuro)
  test('Deve permitir salvar o modo de tema padrão (light)', async () => {
    render(<Settings />);

    const saveThemeButton = screen.getByRole('button', { name: /Salvar Tema/i });
    fireEvent.click(saveThemeButton);
    
    await waitFor(() => {
      expect(mockSaveTheme).toHaveBeenCalledWith(
          expect.objectContaining({ theme_mode: 'light' })
      );
    });
  });
});