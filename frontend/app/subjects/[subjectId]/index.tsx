import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../services/api";
import { useEffect, useState } from "react";
import SessionTrend from "@/app/components/SessionTrend";

type SessionSummary = {
  sessionId: string;
  auc: number | null;
  nTrials: number;
  meanProb: number;
};

export default function SubjectScreen() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const router = useRouter();

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const trendData = sessions
    .sort((a, b) => a.sessionId.localeCompare(b.sessionId))
    .map((s) => ({
      sessionId: s.sessionId,
      value: s.auc ?? s.meanProb,
    }));

  useEffect(() => {
    async function loadSessions() {
      setLoading(true);

      const manifest = await api.getManifest();
      const subject = manifest.subjects.find((s: any) => s.id === subjectId);

      if (!subject) return;

      const summaries: SessionSummary[] = [];

      for (const sess of subject.sessions) {
        try {
          const sessionId = sess.session;
          const pred = await api.getPrediction(subjectId!, sessionId);

          const meanProb =
            pred.probs.reduce((a: number, b: number) => a + b, 0) /
            pred.probs.length;

          summaries.push({
            sessionId: sessionId,
            auc: pred.auc ?? null,
            nTrials: pred.probs.length,
            meanProb,
          });
        } catch (e) {
          console.warn("Failed session", sess);
        }
      }

      setSessions(summaries);
      setLoading(false);
    }

    loadSessions().catch(console.error);
  }, [subjectId]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>
        Subject {subjectId}
      </Text>

      {!loading && <SessionTrend data={trendData} />}

      <Text style={{ marginTop: 6, color: "#555" }}>
        Session Progress Overview
      </Text>

      {loading && <Text style={{ marginTop: 20 }}>Loading sessions…</Text>}

      {!loading &&
        sessions.map((s) => {
          const quality =
            s.auc === null
              ? "Unknown"
              : s.auc >= 0.7
              ? "Good"
              : s.auc >= 0.6
              ? "Moderate"
              : "Low";

          const color =
            quality === "Good"
              ? "#2e7d32"
              : quality === "Moderate"
              ? "#ed6c02"
              : "#d32f2f";

          return (
            <Pressable
              key={s.sessionId}
              onPress={() =>
                router.push(`/sessions/${subjectId}/${s.sessionId}`)
              }
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 8,
                backgroundColor: "#f6f8ff",
              }}
            >
              <Text style={{ fontWeight: "600" }}>Session {s.sessionId}</Text>

              <Text style={{ marginTop: 4 }}>Trials: {s.nTrials}</Text>

              {s.auc !== null && (
                <Text style={{ marginTop: 2 }}>AUC: {s.auc.toFixed(3)}</Text>
              )}

              <Text style={{ marginTop: 2 }}>
                Mean Response: {s.meanProb.toFixed(3)}
              </Text>

              <Text style={{ marginTop: 6, color, fontWeight: "600" }}>
                Quality: {quality}
              </Text>

              <Text
                style={{
                  marginTop: 8,
                  color: "#4f7cff",
                  fontWeight: "600",
                }}
              >
                View Details →
              </Text>
            </Pressable>
          );
        })}
    </ScrollView>
  );
}
