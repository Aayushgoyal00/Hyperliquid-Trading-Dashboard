/**
 * Parse blockchain/wallet errors into user-friendly messages
 */
export function parseErrorMessage(error: unknown, defaultMessage: string): string {
  if (!(error instanceof Error)) {
    return defaultMessage;
  }
  
  const errorStr = error.message.toLowerCase();
  const errorCode = (error as any).code;
  
  // User rejected the transaction
  if (errorStr.includes('user rejected') || 
      errorStr.includes('user denied') || 
      errorCode === 'ACTION_REJECTED' || 
      errorCode === 4001) {
    return 'You cancelled the transaction. Please try again when ready.';
  }
  
  // Network/connection errors
  if (errorStr.includes('network') || errorStr.includes('timeout')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // Insufficient funds
  if (errorStr.includes('insufficient')) {
    return 'Insufficient balance. Please check your wallet balance.';
  }
  
  // Invalid address
  if (errorStr.includes('invalid address')) {
    return 'Invalid recipient address. Please check and try again.';
  }
  
  // Invalid parameters
  if (errorStr.includes('invalid')) {
    return 'Invalid parameters. Please check your inputs.';
  }
  
  // Try to extract meaningful error message from JSON
  const match = error.message.match(/"message":\s*"([^"]+)"/);
  if (match && match[1]) {
    return match[1];
  }
  
  return defaultMessage;
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
  alert('Copied to clipboard!');
}
