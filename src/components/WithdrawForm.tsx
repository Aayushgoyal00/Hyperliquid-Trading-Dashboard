'use client';

import { useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { HttpTransport, ExchangeClient } from '@nktkas/hyperliquid';
import { getIsTestnet } from '@/utils/hyperliquid-config';
import { OnboardingData } from '@/types/trading';
import { parseErrorMessage } from '@/utils/error-parser';

interface WithdrawFormProps {
  onboardingData: OnboardingData;
  onWithdrawSuccess: () => void;
}

export default function WithdrawForm({ onboardingData, onWithdrawSuccess }: WithdrawFormProps) {
  const { wallets } = useWallets();
  const [loading, setLoading] = useState(false);
  const [transferAmount, setTransferAmount] = useState('10');
  const [recipientAddress, setRecipientAddress] = useState('');

  const handleWithdrawFromEmbedded = async () => {
    if (!recipientAddress || !transferAmount || !onboardingData?.embeddedWallet?.address) {
      alert('Please enter recipient address and amount');
      return;
    }
    
    // Validate recipient address format
    if (!recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
      alert('Please enter a valid Ethereum address (0x...)');
      return;
    }
    
    // Parse and validate the transfer amount
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount < 10) {
      alert('Please enter a valid amount (minimum $10 USDC)');
      return;
    }

    // Check if embedded wallet has sufficient balance
    const embeddedBalance = parseFloat(onboardingData.embeddedWallet.hyperliquid.accountValue || '0');
    if (embeddedBalance < amount) {
      alert(`Insufficient balance. Available: $${embeddedBalance.toFixed(2)}`);
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
    //   console.log(`Signer is: ${signer}`);
      // Verify the signer address
      const signerAddress = await signer.getAddress();
    //   console.log(`Using embedded wallet: ${signerAddress}`);
      console.log(`Signer is: ${signer}`);

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

      console.log(`Transferring $${amount} USDC from ${signerAddress} to ${recipientAddress} on ${IS_TESTNET ? 'TESTNET' : 'MAINNET'}...`);

      // Perform the transfer
      const transferResponse = await exchangeClient.usdSend({
        destination: recipientAddress as `0x${string}`,
        amount: amount.toString()
      });

      console.log('Transfer response:', transferResponse);

      if (transferResponse.status === 'ok') {
        alert(`Transfer successful! Transferred $${amount} USDC\n\nTo: ${recipientAddress}`);
        // Clear recipient address and trigger refresh
        setRecipientAddress('');
        setTimeout(() => {
          onWithdrawSuccess();
        }, 2000);
      } else {
        throw new Error(JSON.stringify(transferResponse.response) || 'Transfer failed');
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      const errorMessage = parseErrorMessage(error, 'Transfer failed. Please try again.');
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-400 rounded">
      <h2 className="text-xl font-semibold text-purple-800 mb-3">Withdraw from Trading Wallet</h2>
      <div className="bg-white p-4 rounded text-amber-950">
        <p className="text-sm mb-3">
          Your trading wallet balance:{' '}
          <strong className="text-green-600">
            ${onboardingData.embeddedWallet.hyperliquid.accountValue}
          </strong>{' '}
          USDC
        </p>
        
        <div className="bg-purple-100 p-3 rounded mb-3 text-xs">
          <p className="font-semibold mb-2">Transfer funds to any wallet:</p>
          <p className="mb-1">From: {onboardingData.embeddedWallet.address.slice(0, 10)}...{onboardingData.embeddedWallet.address.slice(-8)} (Trading Wallet)</p>
          <p>To: Enter recipient address below</p>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Recipient Address</label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="w-full p-2 border rounded font-mono text-sm"
            placeholder="0x..."
          />
          <p className="text-xs text-gray-600 mt-1">
            Enter the destination wallet address (must start with 0x)
          </p>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Amount (USDC)</label>
          <input
            type="number"
            step="0.01"
            min="10"
            max={onboardingData.embeddedWallet.hyperliquid.accountValue}
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="10.00"
          />
          <p className="text-xs text-gray-600 mt-1">
            Minimum: $10 USDC | Available: ${onboardingData.embeddedWallet.hyperliquid.accountValue}
          </p>
        </div>

        <button
          onClick={handleWithdrawFromEmbedded}
          disabled={loading || parseFloat(transferAmount) < 10 || !recipientAddress}
          className="w-full bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mb-2"
        >
          {loading ? 'Processing...' : `Withdraw $${transferAmount} USDC`}
        </button>
        
        <p className="text-xs text-gray-500 mt-2">
          Warning: This will transfer USDC from your trading wallet to the specified address on Hyperliquid network
        </p>
      </div>
    </div>
  );
}
