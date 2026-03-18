import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/DashboardHeader';

export const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader
        onCheckout={() => {
          // No portal do cliente, o checkout deve acontecer aqui mesmo.
          // O carregamento do carrinho é feito pelo CartContext, então NÃO limpamos o carrinho antes.
          navigate('/client/checkout');
        }}
        clearCartOnCheckout={false}
      />

      <div className="p-4 md:p-8 flex-1">{children}</div>
    </div>
  );
};

