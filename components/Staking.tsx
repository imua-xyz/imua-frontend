"use client"

import { useWhitelistedTokens } from '@/hooks/useWhitelistedTokens'
import { useClientChainGateway, type TxStatus } from '@/hooks/useClientChainGateway'
import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { truncateAddress } from '@/utils/format'
import { useAccount, useBalance } from 'wagmi'
import { VIRTUAL_TOKEN } from '@/config/constants'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { fromBech32 } from "@cosmjs/encoding"
import { formatEther } from 'viem'
import { useVault } from '@/hooks/useVault'

interface StakingProps {
  onTokenSelect: (token: `0x${string}` | null) => void
}

export function Staking({ onTokenSelect }: StakingProps) {
  const { address: userAddress, isConnected } = useAccount()
  const { tokens, isLoading } = useWhitelistedTokens()
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | null>(null)
  const gateway = useClientChainGateway(selectedToken!)
  const vault = useVault(gateway.vaultAddress as `0x${string}`)

  const { data: balance } = useBalance({
    address: userAddress,
    token: selectedToken && selectedToken.toLowerCase() === VIRTUAL_TOKEN.toLowerCase() ? undefined : selectedToken || undefined,
  })

  const [amount, setAmount] = useState('')
  const [operatorAddress, setOperatorAddress] = useState('')
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null)
  const [txError, setTxError] = useState<string | null>(null)
  const [relayFee, setRelayFee] = useState<bigint>(BigInt(0))

  // Helper to validate Exocore operator address
  const isValidOperatorAddress = (address: string): boolean => {
    try {
      const { prefix, data } = fromBech32(address)
      return prefix === 'exo' && data.length === 20
    } catch {
      return false
    }
  }

  const handleOperation = async (
    operation: () => Promise<`0x${string}`>,
    options?: { requiresApproval?: boolean }
  ) => {
    setTxError(null)
    setTxStatus(options?.requiresApproval ? 'approving' : 'processing')

    try {
      await operation()
      setTxStatus('success')
      setTimeout(() => {
        setTxStatus(null)
        setTxError(null)
      }, 3000)
    } catch (error) {
      console.error('Operation failed:', error)
      setTxStatus('error')
      setTxError(error instanceof Error ? error.message : 'Transaction failed')
      setTimeout(() => {
        setTxStatus(null)
        setTxError(null)
      }, 3000)
    }
  }

  // Update fee when tab changes or when operation type changes
  const updateRelayFee = async (tab: string) => {
    if (!gateway) return
    const fee = await gateway.getQuote(
      tab === 'stake' ? 
        (isValidOperatorAddress(operatorAddress) ? 'delegation' : 'asset') : // deposit vs depositThenDelegate
      tab === 'delegate' ? 'delegation' : 
      tab === 'withdraw' ? 'asset' : 'asset'
    )
    setRelayFee(fee as bigint)
  }

  // Also update fee when operator address changes
  useEffect(() => {
    if (selectedToken) {
      updateRelayFee('stake')
    }
  }, [operatorAddress, selectedToken])

  if (isLoading) return <div>Loading tokens...</div>
  
  return (
    <div className="space-y-6">
      {/* Token Selection */}
      <div className="relative">
        <Select 
          value={selectedToken || undefined}
          onValueChange={(value) => {
            const token = value as `0x${string}`
            setSelectedToken(token)
            onTokenSelect(token)
          }}
          disabled={!isConnected}
        >
          <SelectTrigger>
            <SelectValue placeholder={isConnected ? "Select a token" : "Connect wallet to continue"} />
          </SelectTrigger>
          <SelectContent>
            {tokens?.map((token) => (
              <SelectItem key={token.address} value={token.address}>
                {token.symbol} ({token.name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isConnected && (
          <p className="text-sm text-yellow-600 mt-2">
            Please connect your wallet to start staking
          </p>
        )}
      </div>

      {isConnected && selectedToken && (
        <>
          {/* Token Information Card */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Token Information</h2>
            <div className="space-y-2">
              <InfoRow 
                label="Token Address" 
                value={truncateAddress(selectedToken)}
                fullAddress={selectedToken}
                isLink 
              />
              {Boolean(gateway.vaultAddress) && (
                <InfoRow 
                  label="Vault Address" 
                  value={truncateAddress(gateway.vaultAddress as `0x${string}`)}
                  fullAddress={gateway.vaultAddress as `0x${string}`}
                  isLink 
                  tooltip="Token vault contract that holds your deposits"
                />
              )}
              <InfoRow 
                label="Symbol" 
                value={balance?.symbol || ''} 
              />
              <InfoRow 
                label="Decimals" 
                value={String(balance?.decimals || 18)} 
              />
              <InfoRow 
                label="Balance" 
                value={`${balance?.formatted || '0'} ${balance?.symbol}`} 
              />
              <InfoRow 
                label="Withdrawable" 
                value={`${formatEther(vault.withdrawableAmount ?? BigInt(0))} ${balance?.symbol}`} 
              />
              {relayFee > 0 && (
                <InfoRow 
                  label="Relay Fee" 
                  value={`${formatEther(relayFee)} ETH`}
                  tooltip="LayerZero relay fee for cross-chain message"
                />
              )}
            </div>
          </div>

          <Tabs defaultValue="stake" onValueChange={updateRelayFee}>
            <TabsList className="w-full">
              <TabsTrigger value="stake">Stake</TabsTrigger>
              <TabsTrigger value="delegate">Delegate</TabsTrigger>
              <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            </TabsList>

            <TabsContent value="stake">
              <div className="space-y-4">
                <Input
                  type="number"
                  placeholder="Amount to stake"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <Input
                  placeholder="Operator Address (optional, starts with exo1)"
                  value={operatorAddress}
                  onChange={(e) => setOperatorAddress(e.target.value)}
                />
                <Button 
                  className="w-full"
                  variant={txStatus === 'success' ? 'secondary' : txStatus === 'error' ? 'destructive' : 'default'}
                  onClick={() => handleOperation(
                    () => gateway.handleStakeWithApproval(
                      selectedToken!,
                      amount,
                      isValidOperatorAddress(operatorAddress) ? operatorAddress : undefined,
                      (status, error) => {
                        setTxStatus(status)
                        if (error) setTxError(error)
                      }
                    ),
                    { requiresApproval: true }
                  )}
                  disabled={!!txStatus && txStatus !== 'error'}
                >
                  {txStatus === 'approving' ? 'Approving...' :
                   txStatus === 'processing' ? 'Processing...' :
                   txStatus === 'success' ? 'Success!' :
                   txStatus === 'error' ? 'Failed!' :
                   isValidOperatorAddress(operatorAddress) ? 'Stake' : 'Deposit'}
                </Button>
                {operatorAddress && !isValidOperatorAddress(operatorAddress) && (
                  <p className="text-sm text-yellow-600">
                    Invalid operator address. Must be a valid bech32 address starting with exo1. Transaction will only deposit tokens.
                  </p>
                )}
                {txError && (
                  <p className="text-sm text-red-600 mt-2">
                    {txError}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="delegate">
              <div className="space-y-4">
                <Input
                  placeholder="Operator Address (starts with exo1)"
                  value={operatorAddress}
                  onChange={(e) => setOperatorAddress(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    disabled={txStatus === 'processing'}
                    onClick={() => handleOperation(() => 
                      gateway.handleDelegateTo(
                        operatorAddress,
                        selectedToken!,
                        amount,
                        {
                          onStatus: (status, error) => {
                            setTxStatus(status)
                            if (error) setTxError(error)
                            if (status === 'success' || status === 'error') {
                              setTimeout(() => {
                                setTxStatus(null)
                                setTxError(null)
                              }, 3000)
                            }
                          }
                        }
                      )
                    )}
                  >
                    {txStatus === 'processing' ? 'Processing...' :
                     txStatus === 'success' ? 'Success!' :
                     txStatus === 'error' ? 'Failed!' :
                     'Delegate'}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={txStatus === 'processing'}
                    onClick={() => handleOperation(() =>
                      gateway.handleUndelegateFrom(
                        operatorAddress,
                        selectedToken!,
                        amount,
                        {
                          onStatus: (status, error) => {
                            setTxStatus(status)
                            if (error) setTxError(error)
                            if (status === 'success' || status === 'error') {
                              setTimeout(() => {
                                setTxStatus(null)
                                setTxError(null)
                              }, 3000)
                            }
                          }
                        }
                      )
                    )}
                  >
                    {txStatus === 'processing' ? 'Processing...' :
                     txStatus === 'success' ? 'Success!' :
                     txStatus === 'error' ? 'Failed!' :
                     'Undelegate'}
                  </Button>
                </div>
              </div>
              {txError && (
                <p className="text-sm text-red-600 mt-2">
                  {txError}
                </p>
              )}
            </TabsContent>

            <TabsContent value="withdraw">
              <div className="space-y-4">
                <Input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <Button
                  className="w-full"
                  variant="default"
                  disabled={txStatus === 'processing'}
                  onClick={() => handleOperation(() =>
                    gateway.handleClaimPrincipal(
                      selectedToken!,
                      amount,
                      {
                        onStatus: (status, error) => {
                          setTxStatus(status)
                          if (error) setTxError(error)
                          if (status === 'success' || status === 'error') {
                            setTimeout(() => {
                              setTxStatus(null)
                              setTxError(null)
                            }, 3000)
                          }
                        }
                      }
                    )
                  )}
                >
                  {txStatus === 'processing' ? 'Processing...' :
                   txStatus === 'success' ? 'Success!' :
                   txStatus === 'error' ? 'Failed!' :
                   '1. Claim Principal'}
                </Button>
                <div className="space-y-2">
                  <Input
                    placeholder="Recipient Address (optional)"
                    value={operatorAddress}
                    onChange={(e) => setOperatorAddress(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={txStatus === 'processing'}
                    onClick={() => handleOperation(() =>
                      gateway.handleWithdrawPrincipal(
                        selectedToken!,
                        amount,
                        operatorAddress as `0x${string}`,
                        {
                          onStatus: (status, error) => {
                            setTxStatus(status)
                            if (error) setTxError(error)
                            if (status === 'success' || status === 'error') {
                              setTimeout(() => {
                                setTxStatus(null)
                                setTxError(null)
                              }, 3000)
                            }
                          }
                        }
                      )
                    )}
                  >
                    {txStatus === 'processing' ? 'Processing...' :
                     txStatus === 'success' ? 'Success!' :
                     txStatus === 'error' ? 'Failed!' :
                     '2. Withdraw Principal'}
                  </Button>
                </div>
              </div>
              {txError && (
                <p className="text-sm text-red-600 mt-2">
                  {txError}
                </p>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

// Helper component for info rows
function InfoRow({ 
  label, 
  value, 
  isLink,
  fullAddress,
  tooltip 
}: { 
  label: string
  value: string
  isLink?: boolean
  fullAddress?: string
  tooltip?: string
}) {
  return (
    <div className="flex justify-between items-center group relative">
      <span className="text-gray-600">{label}:</span>
      {isLink ? (
        <a 
          href={`https://sepolia.etherscan.io/token/${fullAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 underline"
        >
          {value}
        </a>
      ) : (
        <span>{value}</span>
      )}
      {tooltip && (
        <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-sm rounded">
          {tooltip}
        </div>
      )}
    </div>
  )
}