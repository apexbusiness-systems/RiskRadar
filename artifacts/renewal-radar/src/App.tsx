import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import ObligationsPage from "@/pages/obligations";
import ObligationDetailPage from "@/pages/obligation-detail";
import ObligationNewPage from "@/pages/obligation-new";
import ImportPage from "@/pages/import";
import DeliveryPage from "@/pages/delivery";
import AuditPage from "@/pages/audit";
import WorkspacePage from "@/pages/workspace";
import NotFound from "@/pages/not-found";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#0f172a",
    colorForeground: "#0f172a",
    colorMutedForeground: "#64748b",
    colorDanger: "#ef4444",
    colorBackground: "#ffffff",
    colorInput: "#f1f5f9",
    colorInputForeground: "#0f172a",
    colorNeutral: "#e2e8f0",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900 font-semibold text-xl",
    headerSubtitle: "text-slate-500 text-sm",
    socialButtonsBlockButtonText: "text-slate-700 font-medium",
    formFieldLabel: "text-slate-700 text-sm font-medium",
    footerActionLink: "text-slate-900 font-medium hover:underline",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-400 text-xs",
    identityPreviewEditButton: "text-slate-700",
    formFieldSuccessText: "text-green-600",
    alertText: "text-red-600",
    logoBox: "flex items-center justify-center mb-2",
    logoImage: "h-8 w-auto",
    socialButtonsBlockButton: "border border-slate-200 bg-white hover:bg-slate-50 transition-colors",
    formButtonPrimary: "bg-slate-900 hover:bg-slate-800 text-white font-medium",
    formFieldInput: "border-slate-200 bg-white text-slate-900 focus:ring-slate-900 focus:border-slate-900",
    footerAction: "border-t border-slate-100 pt-4",
    dividerLine: "bg-slate-200",
    alert: "bg-red-50 border border-red-200 rounded-lg",
    otpCodeFieldInput: "border-slate-200 text-slate-900",
    formFieldRow: "mb-4",
    main: "p-2",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function AppRouter() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: { title: "Welcome back", subtitle: "Sign in to RiskRadar" },
        },
        signUp: {
          start: { title: "Get started", subtitle: "Track your obligations" },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <WorkspaceProvider>
          <TooltipProvider>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/dashboard">
                <ProtectedRoute component={DashboardPage} />
              </Route>
              <Route path="/obligations/new">
                <ProtectedRoute component={ObligationNewPage} />
              </Route>
              <Route path="/obligations/:id">
                <ProtectedRoute component={ObligationDetailPage} />
              </Route>
              <Route path="/obligations">
                <ProtectedRoute component={ObligationsPage} />
              </Route>
              <Route path="/import">
                <ProtectedRoute component={ImportPage} />
              </Route>
              <Route path="/delivery">
                <ProtectedRoute component={DeliveryPage} />
              </Route>
              <Route path="/audit">
                <ProtectedRoute component={AuditPage} />
              </Route>
              <Route path="/workspace">
                <ProtectedRoute component={WorkspacePage} />
              </Route>
              <Route component={NotFound} />
            </Switch>
          </TooltipProvider>
          <Toaster />
        </WorkspaceProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppRouter />
    </WouterRouter>
  );
}

export default App;
