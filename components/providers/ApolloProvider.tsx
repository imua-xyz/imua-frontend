"use client";

import { ApolloProvider as ApolloClientProvider } from "@apollo/client/react";
import { apolloClient } from "@/lib/graphql/client";

interface ApolloProviderProps {
  children: React.ReactNode;
}

export function ApolloProvider({ children }: ApolloProviderProps) {
  return (
    <ApolloClientProvider client={apolloClient}>
      {children}
    </ApolloClientProvider>
  );
}
