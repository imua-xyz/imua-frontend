import IAssetsABI from '../IAssets.abi.json'

// Extract types from ABI
export type TokenInfo = (typeof IAssetsABI)[4]['outputs'][1]['components']
export type StakerBalance = (typeof IAssetsABI)[3]['outputs'][1]['components'] 