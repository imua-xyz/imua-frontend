import { useState } from 'react'
import { useOperators } from '@/hooks/useOperators'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface OperatorSelectorProps {
  onSelect: (address: string) => void
  value?: string
}

export function OperatorSelector({ onSelect, value }: OperatorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: operators, isLoading, error } = useOperators({
    enabled: isOpen // Only fetch when selector is opened
  })

  return (
    <Select 
      onValueChange={onSelect} 
      value={value}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select an operator" />
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <div className="flex items-center gap-2 p-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading operators...
          </div>
        ) : error ? (
          <div className="text-red-500 p-2">Failed to load operators</div>
        ) : (
          operators?.map((operator) => (
            <SelectItem 
              key={operator.address} 
              value={operator.address}
            >
              {operator.operator_meta_info || operator.address} ({(Number(operator.commission.commission_rates.rate) * 100).toFixed(1)}% commission)
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
} 