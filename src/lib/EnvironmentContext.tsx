"use client";

import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";
type OtpChannel = "email" | "sms";

type EnvironmentState = {
  theme: ThemeMode;
  otpChannel: OtpChannel;
  locationState?: string | null;
  isSouthernState: boolean;
  isTimeWindow: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SOUTHERN_STATES = [
  "tamil nadu",
  "kerala",
  "karnataka",
  "andhra pradesh",
  "andhra",
  "telangana",
  "telungana",
];

const EnvironmentContext = createContext<EnvironmentState | undefined>(undefined);

function normalizeState(input?: string | null) {
  return input ? input.trim().toLowerCase() : undefined;
}

function evaluateRules(state?: string | null) {
  const normalized = normalizeState(state);
  const isSouthernState = normalized ? SOUTHERN_STATES.includes(normalized) : false;
  const hour = new Date().getHours();
  const isTimeWindow = hour >= 10 && hour < 12; // 10:00 (inclusive) to 12:00 (exclusive)
  const theme: ThemeMode = isSouthernState && isTimeWindow ? "light" : "dark";
  const otpChannel: OtpChannel = isSouthernState ? "email" : "sms";

  return { theme, otpChannel, isSouthernState, isTimeWindow };
}

async function fetchStateFromIp(): Promise<string | null> {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) throw new Error("Failed to fetch location");
    const data = await response.json();
    return data?.region || data?.state || data?.region_name || null;
  } catch (error) {
    console.warn("Could not resolve state from IP:", error);
    return null;
  }
}

export const EnvironmentProvider = ({ children }: { children: ReactNode }) => {
  const [locationState, setLocationState] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [otpChannel, setOtpChannel] = useState<OtpChannel>("sms");
  const [isSouthernState, setIsSouthernState] = useState(false);
  const [isTimeWindow, setIsTimeWindow] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyRules = (stateValue?: string | null) => {
    const { theme, otpChannel, isSouthernState, isTimeWindow } = evaluateRules(stateValue);
    setTheme(theme);
    setOtpChannel(otpChannel);
    setIsSouthernState(isSouthernState);
    setIsTimeWindow(isTimeWindow);
    // propagate class to html for global theming
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      const lightClass = "light-theme";
      if (theme === "dark") {
        root.classList.add("dark");
        root.classList.remove(lightClass);
      } else {
        root.classList.remove("dark");
        root.classList.add(lightClass);
      }
      root.dataset.theme = theme;
    }
  };

  const refresh = async () => {
    setLoading(true);
    const state = await fetchStateFromIp();
    setLocationState(state);
    applyRules(state);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<EnvironmentState>(
    () => ({
      theme,
      otpChannel,
      locationState,
      isSouthernState,
      isTimeWindow,
      loading,
      refresh,
    }),
    [theme, otpChannel, locationState, isSouthernState, isTimeWindow, loading]
  );

  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
};

export function useEnvironment() {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) throw new Error("useEnvironment must be used within EnvironmentProvider");
  return ctx;
}


