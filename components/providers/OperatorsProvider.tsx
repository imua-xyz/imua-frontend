import { ReactNode } from "react";
import { useOperators } from "@/hooks/useOperators";
import { OperatorsContext } from "@/contexts/OperatorsContext";

export function OperatorsProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useOperators();
  console.log("operators", data);

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
