import { View, Text, ScrollView, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { api } from "./services/api";
import { useAuth } from "./context/AuthContext";
import ProgressTrend from "./components/ProgressTrend";
import AppShell from "./components/AppShell";

export default function HomeScreen() {
  const { subjectId } = useAuth();
  const router = useRouter();

  const [scores, setScores] = useState<number[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);

  function toPercent(score: number) {
    return Math.round(score * 100);
  }

  function interpretOverallProgress(scores: number[]) {
    const first = Math.round(scores[0] * 100);
    const last = Math.round(scores[scores.length - 1] * 100);

    if (scores.length < 2) {
      return `Training has just started. Current focus level is ${last}%.`;
    }

    if (last - first > 5) {
      return `Positive improvement observed: focus increased from ${first}% to ${last}%.`;
    }

    if (last - first < -5) {
      return `Some variation seen: focus changed from ${first}% to ${last}%. This is normal during therapy.`;
    }

    return `Focus level has remained stable around ${last}%.`;
  }

  function latestLabel(score: number) {
    if (score >= 0.7) return { label: "Strong Focus", color: "#2e7d32" };
    if (score >= 0.6) return { label: "Improving", color: "#ed6c02" };
    return { label: "Needs Practice", color: "#d32f2f" };
  }

  useEffect(() => {
    async function load() {
      const manifest = await api.getManifest();
      const subject = manifest.subjects.find((s: any) => s.id === subjectId);
      if (!subject) return;

      const preferSubjectModel = subject.sessions.length >= 3;

      const s: number[] = [];
      const ids: string[] = [];

      for (const sess of subject.sessions) {
        const pred = await api.getPrediction(
          subjectId,
          sess.session,
          preferSubjectModel
        );
        s.push(
          pred.auc ??
            pred.probs.reduce((a: number, b: number) => a + b, 0) /
              pred.probs.length
        );
        ids.push(sess.session);
      }

      setScores(s);
      setSessions(ids);
    }

    load().catch(console.error);
  }, []);

  if (!scores.length) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Loading progress…</Text>
      </View>
    );
  }

  const insight = interpretOverallProgress(scores);
  const latest = latestLabel(scores[scores.length - 1]);

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>
          Your Child’s Therapy Progress
        </Text>

        {/* Insight Card */}
        <View
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 12,
            backgroundColor: "#f5f7ff",
          }}
        >
          <Text style={{ fontWeight: "600" }}>{insight}</Text>
        </View>

        {/* Trend */}
        <View
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 12,
            backgroundColor: "#f5f7ff",
          }}
        >
          <ProgressTrend scores={scores} />
        </View>

        {/* Latest Session */}
        <View
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 12,
            backgroundColor: "#f5f7ff",
          }}
        >
          <Text style={{ fontWeight: "600" }}>Latest Session Summary</Text>

          <Text
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: "700",
              color: latest.color,
            }}
          >
            {toPercent(scores[scores.length - 1])}%
          </Text>

          <Text style={{ color: "#555", marginTop: 4 }}>
            Attention Response Level
          </Text>

          <Text
            style={{ marginTop: 6, fontWeight: "600", color: latest.color }}
          >
            {latest.label}
          </Text>
        </View>

        {/* Sessions */}
        <Text style={{ marginTop: 28, fontSize: 18, fontWeight: "600" }}>
          Session Reports
        </Text>

        {sessions.map((s, i) => (
          <Pressable
            key={s}
            onPress={() => router.push(`/sessions/${subjectId}/${s}`)}
            style={{
              marginTop: 12,
              padding: 16,
              borderRadius: 10,
              backgroundColor: "#f6f8ff",
            }}
          >
            <Text style={{ fontWeight: "600" }}>Session {i + 1}</Text>

            <Text style={{ marginTop: 4, fontSize: 16 }}>
              Focus Level: {Math.round(scores[i] * 100)}%
            </Text>

            <Text style={{ marginTop: 4, color: "#4f7cff", fontWeight: "600" }}>
              View detailed report →
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </AppShell>
  );
}
