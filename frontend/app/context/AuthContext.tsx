import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ModelMode = "auto" | "loso" | "subject";

type AuthState = {
  subjectId: string;
  setSubjectId: (id: string) => void;
  modelMode: ModelMode;
  setModelMode: (mode: ModelMode) => void;
};

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "NEUROSENSE_SUBJECT_ID";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [subjectId, setSubjectIdState] = useState<string>("SBJ01");
  const [modelMode, setModelMode] = useState<ModelMode>("auto");

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
    <AuthContext.Provider
      value={{ subjectId, setSubjectId, modelMode, setModelMode }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
