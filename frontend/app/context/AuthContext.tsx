import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthState = {
  subjectId: string;
  setSubjectId: (id: string) => void;
};

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "NEUROSENSE_SUBJECT_ID";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [subjectId, setSubjectIdState] = useState<string>("SBJ01");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) setSubjectIdState(saved);
      setReady(true);
    });
  }, []);

  function setSubjectId(id: string) {
    setSubjectIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }

  if (!ready) return null; // simple gate while loading storage

  return (
    <AuthContext.Provider value={{ subjectId, setSubjectId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
