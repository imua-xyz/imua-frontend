// contexts/OperatorsContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { useOperators } from '@/hooks/useOperators';
import { OperatorInfo } from '@/types/operator';

export interface OperatorsContextType {
  operators: OperatorInfo[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export const OperatorsContext = createContext<OperatorsContextType>({
  operators: undefined,
  isLoading: false,
  error: null,
});

export function useOperatorsContext() {
    return useContext(OperatorsContext);
}