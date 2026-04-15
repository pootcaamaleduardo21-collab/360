'use client';

import { useTourStore, selectCartTotal } from '@/store/tourStore';
import { ShoppingCart, X, Trash2, Plus, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function CartPanel() {
  const items        = useTourStore((s) => s.items);
  const total        = useTourStore(selectCartTotal);
  const toggleCart   = useTourStore((s) => s.toggleCart);
  const removeFromCart   = useTourStore((s) => s.removeFromCart);
  const updateQuantity   = useTourStore((s) => s.updateQuantity);
  const clearCart        = useTourStore((s) => s.clearCart);

  const currency = items[0]?.product.currency ?? 'MXN';

  return (
    <div className="absolute inset-y-0 right-0 z-40 w-80 flex flex-col bg-gray-900 border-l border-gray-800 shadow-2xl animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-rose-400" />
          <h2 className="text-sm font-semibold">Cotización</h2>
        </div>
        <button onClick={toggleCart} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-600 text-center mt-8">
            No hay productos en la cotización
          </p>
        ) : (
          items.map(({ product, quantity }) => (
            <div key={product.productId} className="flex gap-3 p-3 rounded-xl bg-gray-800">
              {product.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-200 truncate">{product.name}</p>
                <p className="text-xs text-rose-400 font-semibold mt-0.5">
                  {formatCurrency(product.price * quantity, product.currency)}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    onClick={() => updateQuantity(product.productId, quantity - 1)}
                    className="w-5 h-5 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs w-5 text-center">{quantity}</span>
                  <button
                    onClick={() => updateQuantity(product.productId, quantity + 1)}
                    className="w-5 h-5 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => removeFromCart(product.productId)}
                className="text-gray-600 hover:text-red-400 transition-colors self-start"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="p-4 border-t border-gray-800 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Total estimado</span>
            <span className="font-bold text-white">{formatCurrency(total, currency)}</span>
          </div>
          <button className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl transition-colors text-sm">
            Solicitar cotización formal
          </button>
          <button onClick={clearCart} className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Limpiar carrito
          </button>
        </div>
      )}
    </div>
  );
}
