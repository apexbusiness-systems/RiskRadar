import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useUser } from "@clerk/react";

export interface WorkspaceContextValue {
  workspaceId: number | null;
  isLoading: boolean;
  error: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaceId: null,
  isLoading: true,
  error: null,
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      setIsLoading(false);
      return;
    }

    if (initialized) return;

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) return;

    setInitialized(true);
    setIsLoading(true);
    setError(null);

    fetch("/api/me/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email,
        name: user.firstName
          ? `${user.firstName} ${user.lastName ?? ""}`.trim()
          : undefined,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ workspaceId?: number }>;
      })
      .then((data) => {
        if (data.workspaceId) setWorkspaceId(data.workspaceId);
        setIsLoading(false);
      })
      .catch(() => {
        setError("Failed to load workspace. Please refresh the page.");
        setIsLoading(false);
      });
  }, [isLoaded, user, initialized]);

  // Reset when user signs out
  useEffect(() => {
    if (isLoaded && !user) {
      setWorkspaceId(null);
      setInitialized(false);
      setError(null);
    }
  }, [isLoaded, user]);

  return (
    <WorkspaceContext.Provider value={{ workspaceId, isLoading, error }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  return useContext(WorkspaceContext);
}
