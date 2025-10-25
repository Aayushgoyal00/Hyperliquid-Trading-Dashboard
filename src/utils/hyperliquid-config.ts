
export function getIsTestnet(): boolean {
  const envValue = process.env.NEXT_PUBLIC_HYPERLIQUID_IS_TESTNET;
  
  // Default to true (testnet) if not specified
  if (!envValue) {
    console.warn('NEXT_PUBLIC_HYPERLIQUID_IS_TESTNET not set in .env, defaulting to testnet');
    return true;
  }
  
  // Parse the string value to boolean
  return envValue.toLowerCase() === 'true';
}

/**
 * Get the network name (for logging/display)
 */
export function getNetworkName(): string {
  return getIsTestnet() ? 'Testnet' : 'Mainnet';
}
