'use client';

/**
 * This file contains utility functions for working with XRP and XRPL
 */

/**
 * Validates an XRP address
 * This is a simplified version - a real implementation would use the XRPL library
 * 
 * @param address The XRP address to validate
 * @returns True if the address is valid, false otherwise
 */
export function isValidXrpAddress(address: string): boolean {
  if (!address) return false;
  
  // XRP addresses start with 'r' and are typically 25-35 characters long
  if (!address.startsWith('r')) return false;
  
  // Simple regex validation (not comprehensive)
  const regex = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
  return regex.test(address);
}

/**
 * Formats XRP amount for display
 * 
 * @param amount The XRP amount in drops (millionths of XRP)
 * @returns Formatted XRP amount
 */
export function formatXrpAmount(amount: string | number): string {
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Format with 2 decimal places
  return numAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
}

/**
 * Formats XRP address for display
 * 
 * @param address Full XRP address
 * @returns Shortened address (e.g., rAbc...XYZ)
 */
export function formatXrpAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Converts drops to XRP
 * 
 * @param drops XRP amount in drops
 * @returns XRP amount as a string
 */
export function dropsToXrp(drops: string | number): string {
  const dropsNum = typeof drops === 'string' ? parseInt(drops, 10) : drops;
  return (dropsNum / 1000000).toFixed(6);
}

/**
 * Converts XRP to drops
 * 
 * @param xrp XRP amount
 * @returns Drops amount as a string
 */
export function xrpToDrops(xrp: string | number): string {
  const xrpNum = typeof xrp === 'string' ? parseFloat(xrp) : xrp;
  return Math.floor(xrpNum * 1000000).toString();
}

/**
 * Generates a random destination tag for XRP transactions
 * 
 * @returns A random destination tag between 0 and 2^32-1
 */
export function generateDestinationTag(): number {
  return Math.floor(Math.random() * 4294967295);
}

/**
 * Initializes the XRPL client
 * This is a mock function that would be implemented with the real XRPL library
 * 
 * @param network Network to connect to (mainnet, testnet, devnet)
 * @returns XRPL client object
 */
export function initXrplClient(network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet'): any {
  // In a real implementation, this would return an XrplClient instance
  console.log(`Initialized XRPL client for ${network}`);
  return {
    connect: async () => console.log(`Connected to ${network}`),
    disconnect: async () => console.log('Disconnected'),
    isConnected: () => true,
    getBalances: async () => ({ XRP: '100.0' }),
    // More methods would be implemented here
  };
}

/**
 * Gets the current XRP price in USD
 * This is a mock function that would be implemented with a real price API
 * 
 * @returns Promise resolving to the current XRP price
 */
export async function getXrpPrice(): Promise<number> {
  // In a real implementation, this would fetch from a price API
  return 0.57; // Mock price
}

/**
 * Computes the staking APY for XRP
 * This is a mock function that would be implemented with real data
 * 
 * @returns The current staking APY as a percentage
 */
export function getXrpStakingApy(): number {
  // In a real implementation, this would be calculated based on network data
  return 4.5; // Mock APY
}

/**
 * Encodes an Imua (EVM) address into an XRP destination tag
 * @param imuaAddress The Imua EVM address
 * @returns Destination tag for XRP transaction
 */
export function encodeImuaAddressToDestinationTag(imuaAddress: `0x${string}`): number {
  // Remove 0x prefix and convert to bytes
  const addressBytes = imuaAddress.slice(2);
  
  // Use the first 8 characters (4 bytes) of the address as the tag
  // This is a simplified approach - in production you'd want a more robust encoding
  const tag = parseInt(addressBytes.slice(0, 8), 16);
  
  return tag;
}

/**
 * Gets a simplified XRP address for display
 * @param address The full XRP address
 * @returns Shortened address with ellipsis
 */
export function getShortXrpAddress(address: string | null): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
} 