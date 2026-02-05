/**
 * Helpers to read ValidatorContainer fields (matches ValidatorContainer.sol + Endian.sol).
 * Validator container is bytes32[8]: [pubkeyHash, withdrawal_credentials, effective_balance, slashed, ...].
 * effective_balance at index 2 is little-endian uint64 in Gwei.
 */

const VALIDATOR_CONTAINER_EFFECTIVE_BALANCE_INDEX = 2;
const GWEI_TO_WEI = BigInt(10 ** 9);

/**
 * Read little-endian uint64 from the high 64 bits of a bytes32 hex string.
 * Matches Endian.fromLittleEndianUint64(bytes32) in Solidity.
 */
function readLittleEndianUint64FromBytes32(bytes32Hex: string): bigint {
  const raw = bytes32Hex.startsWith("0x") ? bytes32Hex.slice(2) : bytes32Hex;
  if (raw.length < 16) throw new Error("ValidatorContainer: bytes32 too short");
  const high8BytesHex = raw.slice(0, 16);
  const bytes = high8BytesHex.match(/.{2}/g)!;
  const littleEndianHex = bytes.reverse().join("");
  return BigInt("0x" + littleEndianHex);
}

/**
 * Get effective balance (Gwei) from a validator container array.
 * Matches ValidatorContainer.getEffectiveBalance(validatorContainer) in Solidity.
 */
export function getEffectiveBalanceGwei(validatorContainer: `0x${string}`[]): bigint {
  if (validatorContainer.length <= VALIDATOR_CONTAINER_EFFECTIVE_BALANCE_INDEX) {
    throw new Error("ValidatorContainer: invalid length");
  }
  return readLittleEndianUint64FromBytes32(
    validatorContainer[VALIDATOR_CONTAINER_EFFECTIVE_BALANCE_INDEX],
  );
}

/**
 * Get deposit amount in wei from validator container (effective balance in Gwei → wei for 18-decimal token).
 * Used for NST verifyAndDeposit: the initial deposit is the validator's effective balance.
 */
export function getDepositAmountWeiFromValidatorContainer(
  validatorContainer: `0x${string}`[],
): bigint {
  const effectiveBalanceGwei = getEffectiveBalanceGwei(validatorContainer);
  return effectiveBalanceGwei * GWEI_TO_WEI;
}
