'use client';

import { useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { HttpTransport, ExchangeClient } from '@nktkas/hyperliquid';
import { getIsTestnet } from '@/utils/hyperliquid-config';
import { OnboardingData, MarketData } from '@/types/trading';
import { parseErrorMessage } from '@/utils/error-parser';

interface TradingFormProps {
  onboardingData: OnboardingData;
  marketData: MarketData;
  onOrderSuccess: () => void;
}

// Helper function to round to significant digits (Hyperliquid requirement)
function toSignificantDigits(num: number, sigDigits: number): string {
  if (num === 0) return '0';
  
  const sign = Math.sign(num);
  const absNum = Math.abs(num);
  
  // Get the order of magnitude
  const magnitude = Math.floor(Math.log10(absNum));
  
  // Calculate the number of decimal places needed
  const decimalPlaces = sigDigits - magnitude - 1;
  
  // Round to the calculated decimal places
  const factor = Math.pow(10, decimalPlaces);
  const rounded = Math.round(absNum * factor) / factor;
  
  return (sign * rounded).toFixed(Math.max(0, decimalPlaces));
}

export default function TradingForm({ onboardingData, marketData, onOrderSuccess }: TradingFormProps) {
  const { wallets } = useWallets();
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [size, setSize] = useState('0.001');
  const [limitPrice, setLimitPrice] = useState('');

  // Get selected asset details
  const selectedAssetDetails = marketData.assets.find(a => a.name === selectedAsset);
  const sizeStep = selectedAssetDetails ? Math.pow(10, -selectedAssetDetails.szDecimals).toString() : '0.001';

  const handlePlaceOrder = async () => {
    if (!size || parseFloat(size) <= 0) {
      alert('Please enter a valid order size');
      return;
    }

    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      alert('Please enter a valid limit price');
      return;
    }

    setLoading(true);
    try {
      // Find the embedded wallet from Privy wallets
      const embeddedWallet = wallets.find(
        wallet => wallet.walletClientType === 'privy' && 
                  wallet.address.toLowerCase() === onboardingData.embeddedWallet.address.toLowerCase()
      );

      if (!embeddedWallet) {
        throw new Error('Embedded wallet not found. Please refresh and try again.');
      }

      // Get the Ethereum provider from the embedded wallet
      const provider = await embeddedWallet.getEthereumProvider();
      if (!provider) {
        throw new Error('Failed to get wallet provider');
      }

      // Create ethers provider and signer
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      // Verify the signer address
      const signerAddress = await signer.getAddress();
      console.log(`Placing order from wallet: ${signerAddress}`);

      // Initialize Hyperliquid transport
      const IS_TESTNET = getIsTestnet();
      const transport = new HttpTransport({
        isTestnet: IS_TESTNET,
        timeout: 10000,
        fetchOptions: {
          keepalive: false
        }
      });

      const exchangeClient = new ExchangeClient({
        transport,
        wallet: signer as unknown as ethers.Wallet,
        isTestnet: IS_TESTNET
      });

      // Find the asset index
      const assetIndex = marketData.assets.findIndex(a => a.name === selectedAsset);
      if (assetIndex === -1) {
        throw new Error(`Asset ${selectedAsset} not found`);
      }

      // Get the asset for size decimals
      const asset = marketData.assets[assetIndex];
      
      // Round size to the correct number of decimals
      const sizeDecimals = asset.szDecimals;
      const roundedSize = parseFloat(size).toFixed(sizeDecimals);

      // Prepare order parameters
      const isBuy = side === 'buy';
      
      // Get current mark price
      const markPrice = parseFloat(asset.markPx || '0');
      if (markPrice === 0) {
        throw new Error('Unable to get current market price');
      }
      
      // Hyperliquid uses 5 significant digits for prices
      const SIGNIFICANT_DIGITS = 5;
      
      // For market orders, use mark price with slippage
      let orderPrice: string;
      if (orderType === 'market') {
        // Add slippage: buy 5% above mark, sell 5% below mark
        const slippageMultiplier = isBuy ? 1.05 : 0.95;
        const priceWithSlippage = markPrice * slippageMultiplier;
        orderPrice = toSignificantDigits(priceWithSlippage, SIGNIFICANT_DIGITS);
      } else {
        if (!limitPrice || parseFloat(limitPrice) <= 0) {
          throw new Error('Invalid limit price');
        }
        orderPrice = toSignificantDigits(parseFloat(limitPrice), SIGNIFICANT_DIGITS);
      }
      
      console.log(`Placing ${orderType} ${side} order:`, {
        asset: selectedAsset,
        assetIndex,
        size: roundedSize,
        szDecimals: sizeDecimals,
        price: orderPrice,
        significantDigits: SIGNIFICANT_DIGITS,
        markPx: asset.markPx,
        isBuy
      });

      // Place the order
      const orderResponse = await exchangeClient.order({
        orders: [
          {
            a: assetIndex,
            b: isBuy,
            p: orderPrice,
            s: roundedSize,
            r: false,
            t: { limit: { tif: orderType === 'market' ? 'Ioc' : 'Gtc' } }
          }
        ],
        grouping: 'na'
      });

      console.log('Order response:', orderResponse);

      if (orderResponse.status === 'ok') {
        const response = orderResponse.response.data;
        if (response.statuses && response.statuses[0]) {
          const status = response.statuses[0];
          if ('resting' in status) {
            alert(`Order placed successfully!\n\nOrder ID: ${status.resting.oid}\nStatus: Resting (pending fill)`);
          } else if ('filled' in status) {
            alert(`Order filled immediately!\n\nFilled size: ${status.filled.totalSz}\nAverage price: $${status.filled.avgPx}`);
          } else {
            alert(`Order submitted!\n\n${JSON.stringify(status)}`);
          }
          
          // Clear form and refresh
          setSize('0.001');
          setLimitPrice('');
          setTimeout(() => {
            onOrderSuccess();
          }, 2000);
        } else {
          throw new Error('Invalid order response format');
        }
      } else {
        throw new Error(JSON.stringify(orderResponse.response) || 'Order placement failed');
      }
    } catch (error) {
      console.error('Order placement failed:', error);
      const errorMessage = parseErrorMessage(error, 'Order placement failed. Please try again.');
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 p-4 bg-green-50 border-2 border-green-400 rounded">
      <h2 className="text-xl font-semibold text-green-800 mb-3">Place Order</h2>
      <div className="bg-white p-4 rounded">
        {/* Asset Selection */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1 text-gray-700">Select Asset</label>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="w-full p-2 border rounded text-gray-700"
          >
            {marketData.assets.map((asset) => (
              <option key={asset.name} value={asset.name}>
                {asset.name} - ${parseFloat(asset.markPx || '0').toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        {/* Order Type */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1 text-gray-700">Order Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setOrderType('market')}
              className={`flex-1 py-2 px-4 rounded ${
                orderType === 'market'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setOrderType('limit')}
              className={`flex-1 py-2 px-4 rounded ${
                orderType === 'limit'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Limit
            </button>
          </div>
        </div>

        {/* Side Selection */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1 text-gray-700">Side</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSide('buy')}
              className={`flex-1 py-2 px-4 rounded ${
                side === 'buy'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setSide('sell')}
              className={`flex-1 py-2 px-4 rounded ${
                side === 'sell'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Sell
            </button>
          </div>
        </div>

        {/* Size Input */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1 text-gray-700">Size</label>
          <input
            type="number"
            step={sizeStep}
            min="0"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder={sizeStep}
            className="w-full p-2 border rounded text-gray-700"
          />
          <p className="text-xs text-gray-600 mt-1">
            Enter the amount of {selectedAsset} to {side} (Min step: {sizeStep})
          </p>
        </div>

        {/* Limit Price Input (only for limit orders) */}
        {orderType === 'limit' && (
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1 text-gray-700">Limit Price (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="Enter limit price"
              className="w-full p-2 border rounded text-gray-700"
            />
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-gray-100 p-3 rounded mb-3 text-sm text-gray-700">
          <p className="font-semibold mb-1">Order Summary:</p>
          <p>{orderType === 'market' ? 'Market' : 'Limit'} {side.toUpperCase()} {size || '0'} {selectedAsset}</p>
          {orderType === 'limit' && <p>at ${limitPrice || '0'}</p>}
          {orderType === 'market' && (
            <p className="text-xs text-orange-600 mt-1">
              Warning: Market orders execute at current market price
            </p>
          )}
        </div>

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={loading || !size || (orderType === 'limit' && !limitPrice)}
          className={`w-full font-bold py-3 px-4 rounded disabled:opacity-50 ${
            side === 'buy'
              ? 'bg-green-500 hover:bg-green-700 text-white'
              : 'bg-red-500 hover:bg-red-700 text-white'
          }`}
        >
          {loading ? 'Placing Order...' : `${side.toUpperCase()} ${selectedAsset}`}
        </button>

        <p className="text-xs text-gray-500 mt-2">
          Note: Orders are placed on Hyperliquid {getIsTestnet() ? 'Testnet' : 'Mainnet'}
        </p>
      </div>
    </div>
  );
}
