import { NextRequest, NextResponse } from 'next/server';
import { HttpTransport,InfoClient} from '@nktkas/hyperliquid';
import { privyClient ,provider} from '@/utils/privy-signature';
import { createEthersSigner } from '@privy-io/server-auth/ethers';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const { walletId } = await request.json();

    if (!walletId) {
      return NextResponse.json(
        { error: 'Missing walletId' },
        { status: 400 }
      );
    }
    
    console.log(`Onboarding user ${walletId}`);
    const users = await privyClient.getUsers();
    // console.log(`Users: ${JSON.stringify(users, null, 2)}`);
    
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
    ) as any; // Type assertion to handle the union type
    
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
      
      // console.log(`Found existing embedded wallet with ID: ${actualWalletId} at address: ${embeddedAddress}`);
    }

    // Check for external connected wallet (MetaMask, Coinbase, etc.)
    const externalWalletAccount = user.linkedAccounts.find(account => 
      account.type === 'wallet' && 
      'connectorType' in account &&
      account.connectorType !== 'embedded'
    ) as any;

    let externalWalletAddress: string | null = null;
    let externalWalletHyperliquid: any = null;

    if (externalWalletAccount) {
      externalWalletAddress = externalWalletAccount.address;
      // console.log(`Found external wallet: ${externalWalletAddress}`);
    }

    // Check embedded wallet balance on Base chain
    const embeddedBalance = await provider.getBalance(embeddedAddress);
    const embeddedBalanceInEth = ethers.formatEther(embeddedBalance);
    console.log(`Embedded wallet balance: ${embeddedBalanceInEth} ETH`);

    // Initialize Hyperliquid client to check account status
    const transport = new HttpTransport({
      isTestnet: true,
      timeout: 5000,
      fetchOptions: {
        keepalive: false
      }
    });

    const infoClient = new InfoClient({ transport })

    // Check if embedded wallet exists on Hyperliquid
    let embeddedHyperliquidAccount = null;
    let needsEmbeddedHyperliquidFunding = false;
    
    try {
      const userState = await infoClient.clearinghouseState({ 
        user: embeddedAddress as `0x${string}` 
      });
      
      embeddedHyperliquidAccount = {
        exists: true,
        accountValue: userState.marginSummary.accountValue,
        totalRawUsd: userState.marginSummary.totalRawUsd,
        hasPositions: userState.assetPositions.length > 0
      };

      const accountValue = parseFloat(userState.marginSummary.accountValue);
      needsEmbeddedHyperliquidFunding = accountValue < 1;
      
      console.log(`Embedded wallet Hyperliquid account value: $${accountValue}`);
    } catch (error) {
      console.log('Embedded wallet not found on Hyperliquid');
      embeddedHyperliquidAccount = {
        exists: false
      };
      needsEmbeddedHyperliquidFunding = true;
    }

    // Check external wallet on Hyperliquid if it exists
    if (externalWalletAddress) {
      try {
        const externalUserState = await infoClient.clearinghouseState({ 
          user: externalWalletAddress as `0x${string}` 
        });
        
        externalWalletHyperliquid = {
          exists: true,
          accountValue: externalUserState.marginSummary.accountValue,
          totalRawUsd: externalUserState.marginSummary.totalRawUsd,
          hasPositions: externalUserState.assetPositions.length > 0
        };

        const externalAccountValue = parseFloat(externalUserState.marginSummary.accountValue);
        console.log(`External wallet Hyperliquid account value: $${externalAccountValue}`);
      } catch (error) {
        console.log('External wallet not found on Hyperliquid');
        externalWalletHyperliquid = {
          exists: false
        };
      }
    }

    // Determine if user needs to deposit
    const needsEthDeposit = parseFloat(embeddedBalanceInEth) < 0.0001;
    const canTransferFromExternal = externalWalletHyperliquid && 
                                     externalWalletHyperliquid.exists && 
                                     parseFloat(externalWalletHyperliquid.accountValue) >= 10;

    return NextResponse.json({
      success: true,
      embeddedWallet: {
        address: embeddedAddress,
        walletId: actualWalletId,
        isNew: isNewWallet,
        ethBalance: embeddedBalanceInEth,
        hyperliquid: embeddedHyperliquidAccount
      },
      externalWallet: externalWalletAddress ? {
        address: externalWalletAddress,
        hyperliquid: externalWalletHyperliquid
      } : null,
      funding: {
        needsEthDeposit,
        needsEmbeddedHyperliquidFunding,
        canTransferFromExternal,
        message: canTransferFromExternal 
          ? `Your connected wallet has $${externalWalletHyperliquid.accountValue} on Hyperliquid. Transfer some to your trading wallet.`
          : needsEmbeddedHyperliquidFunding
          ? 'Please fund your trading wallet to start trading'
          : 'Wallet is ready for trading'
      },
      canTrade: !needsEthDeposit && !needsEmbeddedHyperliquidFunding,
      message: !needsEthDeposit && !needsEmbeddedHyperliquidFunding
        ? 'Wallet ready for trading'
        : 'Please fund your wallet to continue'
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Onboarding failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}