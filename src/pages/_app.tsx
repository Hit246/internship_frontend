import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { EnvironmentProvider, useEnvironment } from "@/lib/EnvironmentContext";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";

function ThemedShell({ Component, pageProps }: AppProps) {
  const { theme } = useEnvironment();
  const themeClasses =
    theme === "light"
      ? "bg-white text-black"
      : "bg-neutral-950 text-white";

  return (
    <div className={cn("min-h-screen transition-colors duration-300", themeClasses)}>
      <title>Your-Tube Clone</title>
      <Header />
      <Toaster />
      <div className="flex">
        <Sidebar />
        <Component {...pageProps} />
      </div>
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <EnvironmentProvider>
      <UserProvider>
        <ThemedShell Component={Component} pageProps={pageProps} />
      </UserProvider>
    </EnvironmentProvider>
  );
}
