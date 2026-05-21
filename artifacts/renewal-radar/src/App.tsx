import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { Sidebar, StatusBar } from "@/components/risk-radar/Chrome";
import LandingPage from "@/pages/landing";
import CommandCenterPage from "@/pages/command-center";
import RiskRegisterPage from "@/pages/risk-register";
import RiskRecordPage from "@/pages/risk-record";
import RiskIntakePage from "@/pages/risk-intake";
import DeliveryPage from "@/pages/delivery";
import AuditPage from "@/pages/audit";
import WorkspacePage from "@/pages/workspace";
import NotFound from "@/pages/not-found";
import ObligationNewPage from "@/pages/obligation-new";
import ObligationsPage from "@/pages/obligations";
import ObligationDetailPage from "@/pages/obligation-detail";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/"/, "");

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
    logoImageUrl: `${window.location.origin}${basePath}/assets/app-icon.png`,
  },
  variables: {
    colorPrimary: "#F5A623",
    colorForeground: "#F0F4F8",
    colorMutedForeground: "#4A5568",
    colorDanger: "#FF4040",
    colorBackground: "#0A0E18",
    colorInput: "#151D30",
    colorInputForeground: "#F0F4F8",
    colorNeutral: "#0F1524",
    fontFamily: "Space Grotesk, sans-serif",
    borderRadius: "0.5625rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-semibold text-xl",
    headerSubtitle: "text-sm",
    socialButtonsBlockButtonText: "font-medium",
    formFieldLabel: "text-sm font-medium",
    footerActionLink: "font-medium hover:underline",
    footerActionText: "",
    dividerText: "text-xs",
    identityPreviewEditButton: "",
    formFieldSuccessText: "",
    alertText: "",
    logoBox: "flex items-center justify-center mb-2",
    logoImage: "h-8 w-auto",
    socialButtonsBlockButton: "transition-colors",
    formButtonPrimary: "font-medium",
    formFieldInput: "",
    footerAction: "pt-4",
    dividerLine: "",
    alert: "rounded-lg",
    otpCodeFieldInput: "",
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
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "#05070B" }}
    >
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
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "#05070B" }}
    >
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
        <LandingPage onEnter={() => window.location.hash = "#dashboard"} />
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

/* ── Shell layout: Sidebar + StatusBar + main content ── */
function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid h-screen"
      style={{
        gridTemplateColumns: "218px 1fr",
        minWidth: 1120,
      }}
    >
      <Sidebar />
      <div className="flex flex-col overflow-hidden">
        <StatusBar />
        {children}
      </div>
    </div>
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
          start: { title: "Welcome back", subtitle: "Sign in to DueRadar" },
        },
        signUp: {
          start: { title: "Get started", subtitle: "Track your deadlines with DueRadar" },
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
              {/* Landing — no shell */}
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />

              {/* Shell-wrapped authenticated routes */}
              <Route path="/dashboard">
                <ProtectedRoute
                  component={() => (
                    <ShellLayout>
                      <CommandCenterPage />
                    </ShellLayout>
                  )}
                />
              </Route>
              <Route path="/obligations/new">
                <ProtectedRoute
                  component={() => (
                    <ShellLayout>
                      <RiskIntakePage />
                    </ShellLayout>
                  )}
                />
              </Route>
              <Route path="/obligations/:id">
                <ProtectedRoute
                  component={() => (
                    <ShellLayout>
                      <RiskRecordPage />
                    </ShellLayout>
                  )}
                />
              </Route>
              <Route path="/obligations">
                <ProtectedRoute
                  component={() => (
                    <ShellLayout>
                      <RiskRegisterPage />
                    </ShellLayout>
                  )}
                />
              </Route>
              <Route path="/import">
                <ProtectedRoute
                  component={() => (
                    <ShellLayout>
                      <RiskIntakePage />
                    </ShellLayout>
                  )}
                />
              </Route>
              <Route path="/delivery">
                <ProtectedRoute
                  component={() => (
                    <ShellLayout>
                      <DeliveryPage />
                    </ShellLayout>
                  )}
                />
              </Route>
              <Route path="/audit">
                <ProtectedRoute
                  component={() => (
                    <ShellLayout>
                      <AuditPage />
                    </ShellLayout>
                  )}
                />
              </Route>
              <Route path="/workspace">
                <ProtectedRoute
                  component={() => (
                    <ShellLayout>
                      <WorkspacePage />
                    </ShellLayout>
                  )}
                />
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
