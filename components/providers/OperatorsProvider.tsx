import { ReactNode } from "react";
import { useOperators } from "@/hooks/useOperators";
import { OperatorsContext } from "@/contexts/OperatorsContext";
import { Token } from "@/types/tokens";

export function OperatorsProvider({
  children,
  token,
}: {
  children: ReactNode;
  token?: Token;
}) {
  const { data, isLoading, error } = useOperators({ token });

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
