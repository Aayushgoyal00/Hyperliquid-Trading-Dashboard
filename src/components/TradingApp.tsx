'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState, useCallback } from 'react';

interface Asset {
  name: string;
  szDecimals: number;
  [key: string]: unknown;
}

interface MarketData {
  success: boolean;
  assets: Asset[];
  btc: {
    markPx: string;
  };
  userState: {
    marginSummary: any;
    assetPositions: any;
  } | null;
}

interface OrderData {
  assetName: string;
  isBuy: boolean;
  size: string;
  price: string;
}

export default function TradingApp() {
  const { ready, authenticated, user, login, createWallet ,logout } = usePrivy();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderForm, setOrderForm] = useState<OrderData>({
    assetName: 'BTC',
    isBuy: true,
    size: '0.001',
    price: '0'
  });

  const fetchMarketData = useCallback(async () => {
    try {
      if (!user || user.wallet?.address == undefined) return;
      
      // Use query parameters for GET request instead of body
      const response = await fetch(`/api/exchange-info?walletAddress=${encodeURIComponent(user.wallet?.address)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Market data received:', data);
      
      if (data.success) {
        setMarketData(data);
      } else {
        console.error('API returned error:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  }, [user?.wallet?.address]);

  // Auto-login effect
  useEffect(() => {
    if (ready && !authenticated) {
      login(); // Triggers email/social login
    }
  }, [ready, authenticated]);

  // Onboarding effect
  useEffect(() => {
    const handleOnboard = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        console.log(user)
        const response = await fetch('/api/onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletId: user.id || null
          }),
        });
        
        // const data = await response.json();
        const data = {success:"Welcome here"}
        console.log('Onboarded:', data);
        
        if (data.success) {
          setIsOnboarded(true);
          fetchMarketData();
        }
      } catch (error) {
        console.error('Onboarding failed:', error);
      } finally {
        setLoading(false);
      }
    };

    if (authenticated && user && !isOnboarded) {
      handleOnboard();
    }
  }, [authenticated, user, isOnboarded, fetchMarketData]);

  const handleCreateWallet = async () => {
    try {
      await createWallet();
      // After wallet creation, trigger onboarding again
      setTimeout(() => {
        setIsOnboarded(false); // Reset to trigger onboarding
      }, 1000);
    } catch (error) {
      console.error('Wallet creation failed:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user?.wallet?.address) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: user.wallet.address,
          ...orderForm
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Order placed successfully!');
        fetchMarketData(); // Refresh data
      } else {
        alert('Order failed: ' + data.error);
      }
    } catch (error) {
      console.error('Order failed:', error);
      alert('Order failed: ' + error);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Hyperliquid Trading App</h1>
          <p className="mb-4">Please authenticate to continue</p>
          <button 
            onClick={login}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-blue-400 shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Hyperliquid Trading Dashboard</h1>
        
        {/* User Info */}
        <div className="mb-6 p-4 bg-amber-50 rounded text-amber-900">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-semibold">Account Info</h2>
            <button 
              onClick={logout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
            >
              Logout
            </button>
          </div>
          {/* <p><strong>Email:</strong> {user?.email?.address || user?.email?.toString() || 'N/A'}</p> */}
          <p><strong>Wallet:</strong> {user?.wallet?.address || 'No wallet'}</p>
          <p><strong>Status:</strong> {isOnboarded ? 'Onboarded ✅' : 'Not onboarded'}</p>
          
          {!user?.wallet && (
            <button 
              onClick={handleCreateWallet}
              disabled={loading}
              className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Wallet'}
            </button>
          )}
        </div>

        {/* Market Data */}
        {marketData && (
          <div className="mb-6 p-4 bg-yellow-50 rounded text-amber-900">
            <h2 className="text-xl font-semibold mb-2">Market Data</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-medium">BTC Info</h3>
                <p>Mark Price: ${marketData.btc.markPx}</p>
              </div>
              <div>
                <h3 className="font-medium">Available Assets ({marketData.assets.length})</h3>
                <div className="text-sm">
                  {marketData.assets.slice(0, 5).map((asset, index) => (
                    <div key={index}>{asset.name}</div>
                  ))}
                  {marketData.assets.length > 5 && (
                    <div className="text-xs text-gray-600">...and {marketData.assets.length - 5} more</div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-medium">User Account</h3>
                {marketData.userState ? (
                  <div className="text-sm">
                    <p className="text-green-600">✓ Account exists on Hyperliquid</p>
                    {marketData.userState.marginSummary && (
                      <p>Account Value: ${marketData.userState.marginSummary.accountValue || 'N/A'}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="text-orange-600">⚠ No account found</p>
                    <p className="text-xs">Bridge USDC to Hyperliquid to start trading</p>
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={fetchMarketData}
              className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
            >
              Refresh Data
            </button>
          </div>
        )}

        {/* Trading Form */}
        {isOnboarded && user?.wallet && (
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
                  placeholder="0.001"
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
                  placeholder="0"
                />
              </div>
            </div>
            
            <button 
              onClick={handlePlaceOrder}
              disabled={loading}
              className="mt-4 w-full bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Placing Order...' : `${orderForm.isBuy ? 'Buy' : 'Sell'} ${orderForm.assetName}`}
            </button>
          </div>
        )}

        {loading && (
          <div className="mt-4 text-center text-gray-600">
            Processing...
          </div>
        )}
      </div>
    </div>
  );
}