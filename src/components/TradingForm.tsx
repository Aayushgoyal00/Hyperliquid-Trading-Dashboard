'use client';

import { useState } from 'react';
import { OrderData } from '@/types/trading';
import { parseErrorMessage } from '@/utils/error-parser';

interface TradingFormProps {
  embeddedWalletAddress: string;
  onOrderSuccess: () => void;
}

export default function TradingForm({ embeddedWalletAddress, onOrderSuccess }: TradingFormProps) {
  const [loading, setLoading] = useState(false);
  const [orderForm, setOrderForm] = useState<OrderData>({
    assetName: 'BTC',
    isBuy: true,
    size: '0.001',
    price: '0'
  });

  const handlePlaceOrder = async () => {
    if (!embeddedWalletAddress) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: embeddedWalletAddress,
          ...orderForm
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Order placed successfully!');
        onOrderSuccess();
      } else {
        alert(`❌ Order failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Order failed:', error);
      const errorMessage = parseErrorMessage(error, 'Order placement failed. Please try again.');
      alert(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 rounded text-amber-900">
      <h2 className="text-xl font-semibold mb-4">Place Order</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Asset</label>
          <select 
            value={orderForm.assetName}
            onChange={(e) => setOrderForm({...orderForm, assetName: e.target.value})}
            className="w-full p-2 border rounded"
          >
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
            <option value="SOL">SOL</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Side</label>
          <select 
            value={orderForm.isBuy ? 'buy' : 'sell'}
            onChange={(e) => setOrderForm({...orderForm, isBuy: e.target.value === 'buy'})}
            className="w-full p-2 border rounded"
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Size</label>
          <input 
            type="number"
            step="0.001"
            value={orderForm.size}
            onChange={(e) => setOrderForm({...orderForm, size: e.target.value})}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Price (0 for market)</label>
          <input 
            type="number"
            step="0.01"
            value={orderForm.price}
            onChange={(e) => setOrderForm({...orderForm, price: e.target.value})}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
      
      <button
        onClick={handlePlaceOrder}
        disabled={loading}
        className="mt-4 w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? 'Placing Order...' : 'Place Order'}
      </button>
    </div>
  );
}
