import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fromAddress, toAddress, amount } = await request.json();

    if (!fromAddress || !toAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Note: This will require the user to sign the transaction in their external wallet (MetaMask)
    // The actual transfer will be handled client-side via Privy's sendTransaction method
    // This endpoint is just for validation and logging

    console.log(`Transfer request: ${amount} USDC from ${fromAddress} to ${toAddress}`);

    // In production, you would:
    // 1. Validate the addresses
    // 2. Check balances
    // 3. Initiate the Hyperliquid transfer via their API
    // 4. Return transaction hash for tracking

    return NextResponse.json({
      success: true,
      message: 'Please approve the transaction in your wallet',
      from: fromAddress,
      to: toAddress,
      amount: amount
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
