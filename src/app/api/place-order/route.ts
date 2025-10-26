// DEPRECATED: Order placement is now handled directly in the frontend
// using the user's embedded wallet signer (TradingForm.tsx)
// This approach is more secure as it doesn't require server-side authorization keys
// and avoids session expiry issues. This file can be safely deleted.

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This API route is deprecated',
      message: 'Orders are now placed directly from the frontend using client-side wallet signing.',
      details: 'Please update your application to use the new TradingForm component which handles order placement client-side.'
    }, 
    { status: 410 } // 410 Gone - indicates the resource is no longer available
  );
}