import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { createRoot } from "react-dom/client";
import App from "./App";
import { trpc } from "./lib/trpc";
import { getCurrentTutorPortalToken } from "./lib/tutorPortalSession";
import "./index.css";
import "./styles/brand-foundation.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const trpcClient = trpc.createClient({
  links: [httpBatchLink({
    url: "/api/trpc",
    transformer: superjson,
    headers: () => {
      const tutorPortalToken = getCurrentTutorPortalToken();
      return tutorPortalToken ? { "x-connect-tutor-portal-session": tutorPortalToken } : {};
    },
  })],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>,
);
