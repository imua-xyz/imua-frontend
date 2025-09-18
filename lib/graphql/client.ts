import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";
import { GRAPHQL_ENDPOINT } from "@/config/graphql";

// HTTP link with modern configuration
const httpLink = new HttpLink({
  uri: GRAPHQL_ENDPOINT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auth link for dynamic headers using modern ApolloLink
const authLink = new ApolloLink((operation, forward) => {
  // Add dynamic headers here if needed
  // const token = localStorage.getItem('token');
  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      // authorization: token ? `Bearer ${token}` : '',
    },
  }));
  return forward(operation);
});

// Error handling link using modern ErrorLink
const errorLink = new ErrorLink(({ error }) => {
  if (error) {
    console.error(`[GraphQL error]: ${error.message}`);
  }
});

// Cache configuration
const cache = new InMemoryCache({
  typePolicies: {
    BootstrapValidator: {
      keyFields: ["validatorImAddr"],
    },
    BootstrapToken: {
      keyFields: ["assetId"],
    },
    BootstrapDelegationState: {
      keyFields: ["stakerId", "assetId", "operatorAddr"],
    },
    BootstrapStakerAsset: {
      keyFields: ["stakerId", "assetId"],
    },
    BootstrapOperatorAsset: {
      keyFields: ["operatorAddr", "assetId"],
    },
  },
});

// Create Apollo Client with modern link composition
export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      errorPolicy: "all",
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: "all",
    },
  },
  // DevTools are automatically enabled in development
  // connectToDevTools is not needed in Apollo Client v4
});

// Helper function to clear cache
export const clearApolloCache = () => {
  apolloClient.clearStore();
};
