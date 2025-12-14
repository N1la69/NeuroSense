import { Platform } from "react-native";

const LOCAL_LAN_IP = "192.168.31.17";

export const BASE_URL =
  Platform.OS === "android"
    ? `http://${LOCAL_LAN_IP}:8000`
    : "http://localhost:8000";

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status}: ${txt}`);
  }
  return res.json();
}

export const api = {
  getManifest: () => apiGet<any>("/manifest"),
  getPrediction: (
    subjectId: string,
    sessionId: string,
    preferSubjectModel: boolean
  ) =>
    apiGet<any>(
      `/predict/session/${subjectId}/${sessionId}?prefer_subject_model=${preferSubjectModel}`
    ),
  getNSI: (subjectId: string) => apiGet<any>(`/nsi/${subjectId}`),
};
