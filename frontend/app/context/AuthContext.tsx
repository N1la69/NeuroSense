import { createContext, useContext, useState } from "react";

type AuthState = {
  subjectId: string;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 🔴 TEMP: hardcoded parent → child
  const [auth] = useState<AuthState>({
    subjectId: "SBJ01",
  });

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
