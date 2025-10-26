import { NextRequest, NextResponse } from 'next/server';
import { privyClient } from '@/utils/privy-signature';

export async function POST(request: NextRequest) {
  try {
    const { walletId } = await request.json();

    if (!walletId) {
      return NextResponse.json(
        { error: 'Missing walletId' },
        { status: 400 }
      );
    }
    
    // console.log(`Onboarding user ${walletId}`);
    const users = await privyClient.getUsers();
    
    // Find the specific user by ID
    const user = users.find(u => u.id === walletId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      );
    }
    
    let wallet;
    let embeddedAddress: string;
    let actualWalletId: string;
    let isNewWallet = false;

    // Check linkedAccounts for embedded wallets
    const embeddedWalletAccount = user.linkedAccounts.find(account => 
      account.type === 'wallet' && 
      'connectorType' in account &&
      account.connectorType === 'embedded' &&
      account.id !== null
    ) as any;
    
    if (!embeddedWalletAccount) {
      console.log('User does not have an embedded wallet, creating one...');
      
      // Create a new Ethereum wallet for the user
      wallet = await privyClient.walletApi.createWallet({
        chainType: 'ethereum',
        owner: {
          userId: user.id
        }
      });
      
      embeddedAddress = wallet.address;
      actualWalletId = wallet.id;
      isNewWallet = true;
      console.log(`Created new wallet: ${wallet.id} at address: ${embeddedAddress}`);
    } else {
      // User has an existing embedded wallet
      embeddedAddress = embeddedWalletAccount.address;
      actualWalletId = embeddedWalletAccount.id;
    }

    // Check for external connected wallet (MetaMask, Coinbase, etc.)
    const externalWalletAccount = user.linkedAccounts.find(account => 
      account.type === 'wallet' && 
      'connectorType' in account &&
      account.connectorType !== 'embedded'
    ) as any;

    let externalWalletAddress: string | null = null;

    if (externalWalletAccount) {
      externalWalletAddress = externalWalletAccount.address;
    }

    // Return wallet addresses - balance checking will be done on frontend
    return NextResponse.json({
      success: true,
      embeddedWallet: {
        address: embeddedAddress,
        walletId: actualWalletId,
        isNew: isNewWallet
      },
      externalWallet: externalWalletAddress ? {
        address: externalWalletAddress
      } : null,
      message: 'Wallet created successfully. Please check balances on frontend.'
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Onboarding failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}