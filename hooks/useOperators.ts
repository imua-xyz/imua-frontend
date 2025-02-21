import { useQuery } from '@tanstack/react-query'
import { COSMOS_CONFIG } from '@/config/cosmos'

interface OperatorInfo {
  address: string
  commission: {
    commission_rates: {
      rate: string
      max_rate: string
      max_change_rate: string
    }
    update_time: string
  }
  earnings_addr: string
  approve_addr: string
  operator_meta_info: string
  client_chain_earnings_addr: {
    earning_info_list: any[] // Update this type if needed
  }
}

async function fetchOperators(): Promise<OperatorInfo[]> {
  // First get all operator addresses
  const response = await fetch(`${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.ALL_OPERATORS}`)
  const { operator_acc_addrs: addresses } = await response.json()

  // Then fetch details for each operator
  const operatorDetails = await Promise.all(
    addresses.map(async (addr: string) => {
      const infoResponse = await fetch(`${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.OPERATOR_INFO(addr)}`)
      const info = await infoResponse.json()
      return {
        address: addr,
        ...info
      }
    })
  )

  return operatorDetails
}

export function useOperators(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['operators'],
    queryFn: async () => {
      const operators = await fetchOperators()
      // Sort by commission rate (ascending)
      return operators.sort((a, b) => 
        Number(a.commission.commission_rates.rate) - Number(b.commission.commission_rates.rate)
      )
    },
    refetchInterval: 30000,
    enabled: options?.enabled,
  })
} 