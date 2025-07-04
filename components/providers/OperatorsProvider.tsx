import { ReactNode } from "react";
import { useOperators } from "@/hooks/useOperators";
import { OperatorsContext } from "@/contexts/OperatorsContext";

export function OperatorsProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useOperators();

  return (
    <OperatorsContext.Provider
      value={{
        operators: data,
        isLoading,
        error,
      }}
    >
      {children}
    </OperatorsContext.Provider>
  );
}
