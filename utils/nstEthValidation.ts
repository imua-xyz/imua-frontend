import { isHex } from "viem";

/**
 * NST ETH Validation Utilities
 * 
 * Common validation functions for Native Staking (NST) operations
 * related to Ethereum validators and staking data.
 */

/**
 * Validates if a string is a valid Ethereum validator public key
 * @param pubkey - The public key string to validate
 * @returns true if the public key is a valid 48-byte hex string
 */
export const isValidPublicKey = (pubkey: string): boolean => {
  return isHex(pubkey) && pubkey.length === 98; // 0x + 48 bytes * 2 = 98 characters
};

/**
 * Validates if a string is a valid Ethereum signature
 * @param signature - The signature string to validate
 * @returns true if the signature is a valid 96-byte hex string
 */
export const isValidSignature = (signature: string): boolean => {
  return isHex(signature) && signature.length === 194; // 0x + 96 bytes * 2 = 194 characters
};

/**
 * Validates if a string is a valid deposit data root
 * @param depositDataRoot - The deposit data root string to validate
 * @returns true if the deposit data root is a valid 32-byte hex string
 */
export const isValidDepositDataRoot = (depositDataRoot: string): boolean => {
  return isHex(depositDataRoot) && depositDataRoot.length === 66; // 0x + 32 bytes * 2 = 66 characters
};

/**
 * Validates if a string is a valid state root (32 bytes)
 * @param stateRoot - The state root string to validate
 * @returns true if the state root is a valid 32-byte hex string
 */
export const isValidStateRoot = (stateRoot: string): boolean => {
  return isHex(stateRoot) && stateRoot.length === 66; // 0x + 32 bytes * 2 = 66 characters
};

/**
 * Validates if a string is a valid bytes32 value
 * @param bytes32 - The bytes32 string to validate
 * @returns true if the bytes32 is a valid 32-byte hex string
 */
export const isValidBytes32 = (bytes32: string): boolean => {
  return isHex(bytes32) && bytes32.length === 66; // 0x + 32 bytes * 2 = 66 characters
};

/**
 * Validates if an array contains valid hex strings
 * @param hexArray - Array of hex strings to validate
 * @returns true if all elements are valid hex strings
 */
export const isValidHexArray = (hexArray: string[]): boolean => {
  return hexArray.every(item => isHex(item));
};
