import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../services/api";
import { useEffect, useState } from "react";

type SessionSummary = {
  sessionId: string;
  score: number; // auc or meanProb
};

function interpretSession(score: number) {
  if (score >= 0.7) {
    return {
      label: "Strong Focus",
      description: "Your child showed strong attention during this session.",
      color: "#2e7d32",
    };
  }

  if (score >= 0.6) {
    return {
      label: "Improving Focus",
      description: "Your child is improving and responding well to training.",
      color: "#ed6c02",
    };
  }

  return {
    label: "Needs More Practice",
    description:
      "This session was challenging. Continued practice will help improve focus.",
    color: "#d32f2f",
  };
}

export default function SubjectScreen() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const router = useRouter();

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      setLoading(true);

      const manifest = await api.getManifest();
      const subject = manifest.subjects.find((s: any) => s.id === subjectId);
      if (!subject) return;

      const preferSubjectModel = subject.sessions.length >= 3;

      const summaries: SessionSummary[] = [];

      for (const sess of subject.sessions) {
        try {
          const sessionId = sess.session;
          const pred = await api.getPrediction(
            subjectId!,
            sessionId,
            preferSubjectModel
          );

          const score =
            pred.auc ??
            pred.probs.reduce((a: number, b: number) => a + b, 0) /
              pred.probs.length;

          summaries.push({ sessionId, score });
        } catch {}
      }

      setSessions(summaries);
      setLoading(false);
    }

    loadSessions().catch(console.error);
  }, [subjectId]);

  const latest = sessions[sessions.length - 1];

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      {/* Header */}
      <Text style={{ fontSize: 22, fontWeight: "700" }}>
        Your Child’s Training Progress
      </Text>

      <Text style={{ marginTop: 6, color: "#555" }}>
        A simple overview of how your child is responding to attention training.
      </Text>

      {/* Overall Summary */}
      {!loading &&
        latest &&
        (() => {
          const info = interpretSession(latest.score);
          return (
            <View
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 10,
                backgroundColor: "#f5f7ff",
              }}
            >
              <Text style={{ fontWeight: "600", fontSize: 16 }}>
                Latest Session Summary
              </Text>

              <Text style={{ marginTop: 6, fontSize: 15, color: info.color }}>
                {info.label}
              </Text>

              <Text style={{ marginTop: 4, color: "#555" }}>
                {info.description}
              </Text>
            </View>
          );
        })()}

      {/* Session History */}
      <Text style={{ marginTop: 28, fontSize: 18, fontWeight: "600" }}>
        Session History
      </Text>

      {loading && <Text style={{ marginTop: 12 }}>Loading sessions…</Text>}

      {!loading &&
        sessions.map((s, i) => {
          const info = interpretSession(s.score);

          return (
            <Pressable
              key={s.sessionId}
              onPress={() =>
                router.push(`/sessions/${subjectId}/${s.sessionId}`)
              }
              style={{
                marginTop: 14,
                padding: 16,
                borderRadius: 10,
                backgroundColor: "#f6f8ff",
              }}
            >
              <Text style={{ fontWeight: "600" }}>Session {i + 1}</Text>

              <Text
                style={{ marginTop: 6, color: info.color, fontWeight: "600" }}
              >
                {info.label}
              </Text>

              <Text style={{ marginTop: 4, color: "#555" }}>
                {info.description}
              </Text>

              <Text
                style={{
                  marginTop: 8,
                  color: "#4f7cff",
                  fontWeight: "600",
                }}
              >
                View Session Details →
              </Text>
            </Pressable>
          );
        })}
    </ScrollView>
  );
}
