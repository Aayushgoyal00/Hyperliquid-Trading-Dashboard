import { NextRequest, NextResponse } from 'next/server';
import { getSigner } from '@/utils/privy-signature';
import { HttpTransport, ExchangeClient, InfoClient } from '@nktkas/hyperliquid';

export async function POST(request: NextRequest) {
  try {
    const { fromWalletId, toAddress, amount } = await request.json();
    
    console.log('Received transfer request:', { fromWalletId, toAddress, amount });

    if (!fromWalletId || !toAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: fromWalletId, toAddress, amount' },
        { status: 400 }
      );
    }

    // Validate amount is positive and meets minimum requirement
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number.' },
        { status: 400 }
      );
    }

    // Hyperliquid minimum transfer is $10 USDC
    if (transferAmount < 10) {
      return NextResponse.json(
        { error: 'Minimum transfer amount is $10 USDC' },
        { status: 400 }
      );
    }

    // Initialize Hyperliquid clients
    const transport = new HttpTransport({
      isTestnet: true,
      timeout: 10000,
      fetchOptions: {
        keepalive: false
      }
    });

    const publicClient = new InfoClient({ transport });

    // Get the signer from Privy (sender's wallet)
    // console.log(`Getting signer for wallet ID: ${fromWalletId}`);
    const signer = await getSigner(fromWalletId);
    // console.log(signer);
    if (!signer) {
      return NextResponse.json(
        { error: 'Failed to get wallet signer' },
        { status: 400 }
      );
    }

    const fromAddress = await signer.getAddress();
    console.log(`Transfer from: ${fromAddress} to: ${toAddress}`);

    // Check sender's account exists and has funds
    let senderState = null;
    try {
      senderState = await publicClient.clearinghouseState({ 
        user: fromAddress as `0x${string}` 
      });
      
      if (!senderState || !senderState.marginSummary) {
        return NextResponse.json(
          { error: 'Sender account does not exist on Hyperliquid' },
          { status: 400 }
        );
      }

      const accountValue = parseFloat(senderState.marginSummary.accountValue);
      if (accountValue < transferAmount) {
        return NextResponse.json(
          { 
            error: `Insufficient funds. Available: $${accountValue.toFixed(2)}, Requested: $${transferAmount.toFixed(2)}` 
          },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error checking sender state:', error);
      return NextResponse.json(
        { error: 'Failed to verify sender account' },
        { status: 500 }
      );
    }

    // Check if recipient address exists
    let recipientExists = false;
    try {
      const recipientState = await publicClient.clearinghouseState({ 
        user: toAddress as `0x${string}` 
      });
      recipientExists = recipientState !== null;
    } catch {
      console.log('Recipient account does not exist yet - will be created on first transfer');
    }

    // Initialize exchange client with sender's signer
    const exchangeClient = new ExchangeClient({
      transport,
      wallet: signer
    });

    // Perform the USDC transfer
    console.log(`Transferring $${transferAmount} USDC...`);
    
    const transferResponse = await exchangeClient.usdSend({
      destination: toAddress as `0x${string}`,
      amount: amount.toString() // Amount in USD (e.g., "10" for $10)
    });

    console.log('Transfer response:', transferResponse);

    // Wait a moment for the transfer to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get updated balances
    let updatedSenderState = null;
    let updatedRecipientState = null;

    try {
      updatedSenderState = await publicClient.clearinghouseState({ 
        user: fromAddress as `0x${string}` 
      });
    } catch (error) {
      console.error('Error fetching updated sender state:', error);
    }

    try {
      updatedRecipientState = await publicClient.clearinghouseState({ 
        user: toAddress as `0x${string}` 
      });
    } catch (error) {
      console.error('Error fetching updated recipient state:', error);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully transferred $${transferAmount} USDC`,
      transfer: {
        from: fromAddress,
        to: toAddress,
        amount: transferAmount,
        recipientWasNew: !recipientExists
      },
      response: transferResponse,
      balances: {
        sender: {
          before: senderState?.marginSummary?.accountValue || '0',
          after: updatedSenderState?.marginSummary?.accountValue || '0'
        },
        recipient: {
          before: recipientExists ? 'existing account' : '0',
          after: updatedRecipientState?.marginSummary?.accountValue || '0'
        }
      }
    });

  } catch (error) {
    console.error('Transfer error:', error);
    return NextResponse.json(
      { 
        error: 'Transfer failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
