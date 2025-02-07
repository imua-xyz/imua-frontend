import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { fromBech32 } from '@cosmjs/encoding'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidOperatorAddress(address: string): boolean {
  try {
    const { prefix, data } = fromBech32(address)
    return prefix === 'exo' && data.length === 20
  } catch {
    return false
  }
}