"use client";

import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, ReactNode, useEffect } from "react";
import { createContext, useContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";

interface UserContextType {
  user: any;
  login: (userdata: any) => void;
  logout: () => Promise<void>;
  handlegooglesignin: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// helper: try to pick the user object from various backend shapes
function pickUserFromResponse(resp: any) {
  if (!resp) return null;
  const payload = resp.data ?? resp;
  // common shapes: { result: user }, { user: user }, or direct user object
  return payload?.result ?? payload?.user ?? (payload && typeof payload === "object" ? payload : null);
}

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);

  // hydrate from localStorage once so pages that access user immediately don't crash
  useEffect(() => {
    try {
      if (typeof window === "undefined") return; // Skip if not in browser
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        // only restore if looks like a user object with some id-like field
        if (parsed && (parsed._id || parsed.id || parsed.email)) {
          setUser(parsed);
        } else {
          // stale/invalid store
          localStorage.removeItem("user");
        }
      }
    } catch (err) {
      console.warn("Failed to read user from localStorage", err);
    }
  }, []);

  const login = (userdata: any) => {
    if (!userdata || typeof userdata !== "object") {
      console.warn("login() called with invalid userdata — ignoring:", userdata);
      return;
    }
    // normalize id: if backend uses id instead of _id, copy it
    if (!userdata._id && userdata.id) userdata._id = userdata.id;

    setUser(userdata);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(userdata));
      }
    } catch (err) {
      console.warn("Failed to write user to localStorage", err);
    }
  };

  const logout = async () => {
    setUser(null);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("user");
      }
    } catch (err) {
      /* ignore */
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };

      // call backend
      const response = await axiosInstance.post("/user/login", payload);

      // try to extract usable user object
      const picked = pickUserFromResponse(response);
      if (!picked) {
        // fallback: if response.data.result is undefined but response.data exists, try that
        console.warn("/user/login did not return a user object in expected shape:", response?.data);
        // still attempt to login with what backend gave (best-effort) to avoid breaking pages
        // but only if response.data looks like an object
        if (response?.data && typeof response.data === "object") {
          login(response.data);
        } else {
          // as a last fallback, login with minimal firebase info so pages that expect user have something
          const fallback = { name: payload.name, email: payload.email, image: payload.image };
          login(fallback);
        }
        return;
      }

      // normalize id field
      if (!picked._id && picked.id) picked._id = picked.id;

      login(picked);
    } catch (error) {
      console.error("Google sign-in / backend login failed:", error);
    }
  };

  useEffect(() => {
    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        try {
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          const response = await axiosInstance.post("/user/login", payload);

          const picked = pickUserFromResponse(response);
          if (!picked) {
            console.warn("onAuthStateChanged: backend returned unexpected shape:", response?.data);
            // fallback to minimal user object derived from firebase so UI has something
            login({ name: payload.name, email: payload.email, image: payload.image });
            return;
          }

          if (!picked._id && picked.id) picked._id = picked.id;
          login(picked);
        } catch (error) {
          console.error("Error during onAuthStateChanged handling:", error);
          // if backend failed, sign the user out locally to avoid inconsistent state
          try {
            await logout();
          } catch { }
        }
      } else {
        // no firebase user -> cleanup local state
        try {
          await logout();
        } catch { }
      }
    });

    return () => unsubcribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout, handlegooglesignin }
    }>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};
