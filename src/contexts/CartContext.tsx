import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface CartItem {
  variationId: string;
  productId: string;
  productName: string;
  variationInfo: string;
  quantity: number;
  unitPrice: number;
  availableStock: number;
  imageUrl?: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItems: (newItems: CartItem[]) => void;
  updateQuantity: (variationId: string, delta: number) => void;
  removeItem: (variationId: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalValue: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();

  const storageKey = useMemo(() => {
    // Carrinho deve ser individual por usuário (não compartilhar entre logins).
    if (!user) return 'products-cart-anon';
    return `products-cart-${user.id}`;
  }, [user]);

  const [items, setItems] = useState<CartItem[]>([]);

  // Carrega carrinho do usuário logado.
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setItems([]);
      try {
        localStorage.setItem('products-cart-anon', JSON.stringify([]));
      } catch {
        // ignore
      }
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      setItems(stored ? (JSON.parse(stored) as CartItem[]) : []);
    } catch {
      setItems([]);
    }
  }, [authLoading, user, storageKey]);

  // Persiste carrinho do usuário logado.
  useEffect(() => {
    if (authLoading) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // ignore localStorage write errors
    }
  }, [items, storageKey, authLoading]);

  const addItems = (newItems: CartItem[]) => {
    setItems(prev => {
      const updated = [...prev];
      
      newItems.forEach(item => {
        const existingIndex = updated.findIndex(c => c.variationId === item.variationId);
        if (existingIndex >= 0) {
          const newQty = updated[existingIndex].quantity + item.quantity;
          if (newQty <= item.availableStock) {
            updated[existingIndex].quantity = newQty;
          }
        } else {
          updated.push(item);
        }
      });
      
      return updated;
    });
  };

  const updateQuantity = (variationId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.variationId === variationId) {
        const newQty = item.quantity + delta;
        if (newQty < 1 || newQty > item.availableStock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (variationId: string) => {
    setItems(prev => prev.filter(item => item.variationId !== variationId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  return (
    <CartContext.Provider value={{
      items,
      addItems,
      updateQuantity,
      removeItem,
      clearCart,
      totalItems,
      totalValue
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
