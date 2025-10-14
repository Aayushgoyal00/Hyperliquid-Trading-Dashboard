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
    let address: string;
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
      
      address = wallet.address;
      actualWalletId = wallet.id;
      isNewWallet = true;
      console.log(`Created new wallet: ${wallet.id} at address: ${address}`);
    } else {
      // User has an existing embedded wallet
      address = embeddedWalletAccount.address;
      actualWalletId = embeddedWalletAccount.id;
      
      console.log(`Found embedded wallet with ID: ${actualWalletId} at address: ${address}`);
    }

    // Check wallet balance on Base chain
    const balance = await provider.getBalance(address);
    const balanceInEth = ethers.formatEther(balance);
    console.log(`Wallet balance: ${balanceInEth} ETH`);

// Initialize Hyperliquid client to check account status
    const transport = new HttpTransport({
      isTestnet: true,
      timeout: 5000,
      fetchOptions: {
        keepalive: false
      }
    });

    const infoClient = new InfoClient({ transport })


    // Check if user exists on Hyperliquid
    let hyperliquidAccount = null;
    let needsHyperliquidFunding = false;
    
    try {
      const userState = await infoClient.clearinghouseState({ 
        user: address as `0x${string}` 
      });
      
      hyperliquidAccount = {
        exists: true,
        accountValue: userState.marginSummary.accountValue,
        totalRawUsd: userState.marginSummary.totalRawUsd,
        hasPositions: userState.assetPositions.length > 0
      };

      // Check if account needs funding (less than $1)
      const accountValue = parseFloat(userState.marginSummary.accountValue);
      needsHyperliquidFunding = accountValue < 1;
      
      console.log(`Hyperliquid account value: $${accountValue}`);
      } catch (error) {
      console.log('User not found on Hyperliquid');
      hyperliquidAccount = {
        exists: false
      };
      needsHyperliquidFunding = true;
    }

    // Determine if user needs to deposit
    const needsDeposit = parseFloat(balanceInEth) < 0.0001 || needsHyperliquidFunding;

    // Check Hyperliquid account
    // const preTransferCheck = await infoClient.preTransferCheck({
    //   user: address as `0x${string}`,
    //   source: address as `0x${string}`,
    // });

    // let hyperliquidAccount = true;
    // let fundingMessage = '';

    // if (!preTransferCheck.userExists) {
    //   // User needs to fund their account
    //   hyperliquidAccount = false;
    //   fundingMessage = 'Account needs funding. Please bridge USDC to Hyperliquid.';
      
      // Note: In a real implementation, you might trigger automated funding here
      // const fundTx = await signer.sendTransaction({
      //   to: 'hyperliquid-bridge-address',
      //   value: ethers.parseEther('10'),
      // });
      // await fundTx.wait();
    // }

    // Store session data (in production, use Redis or database)
    // For demo purposes, we'll just return the data
    
    return NextResponse.json({
      success: true,
      address,
      walletId: actualWalletId,
      isNewWallet,
      balance: {
        eth: balanceInEth,
        needsDeposit: parseFloat(balanceInEth) < 0.0001,
        message: parseFloat(balanceInEth) < 0.0001 
          ? 'Please deposit ETH to your wallet to cover gas fees'
          : 'Wallet has sufficient ETH for gas'
      },
      hyperliquid: {
        exists: hyperliquidAccount?.exists || false,
        accountValue: hyperliquidAccount?.accountValue || '0',
        needsFunding: needsHyperliquidFunding,
        message: needsHyperliquidFunding
          ? 'Please bridge USDC to Hyperliquid to start trading'
          : 'Hyperliquid account is funded and ready'
      },
      canTrade: !needsDeposit,
      message: needsDeposit 
        ? 'Please fund your wallet to continue' 
        : 'Wallet ready for trading'
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Onboarding failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}