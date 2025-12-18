// frontend/app/index.tsx

import { View, Text, ScrollView, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { api } from "./services/api";
import { useAuth } from "./context/AuthContext";
import ProgressTrend from "./components/ProgressTrend";
import AppShell from "./components/AppShell";

export default function HomeScreen() {
  const { subjectId, modelMode, setModelMode } = useAuth();
  const router = useRouter();

  const [scores, setScores] = useState<number[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [nsi, setNsi] = useState<number | null>(null);
  const [nsiInfo, setNsiInfo] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<any | null>(null);

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
      return `Positive improvement observed: Focus increased from ${first}% to ${last}%.`;
    }

    if (last - first < -5) {
      return `Some variation seen: Focus changed from ${first}% to ${last}%. This is normal during therapy.`;
    }

    return `Focus level has remained stable around ${last}%.`;
  }

  function latestLabel(score: number) {
    if (score >= 0.7) return { label: "Strong Focus", color: "#2e7d32" };
    if (score >= 0.6) return { label: "Improving", color: "#ed6c02" };
    return { label: "Needs Practice", color: "#d32f2f" };
  }

  function interpretNSI(value: number) {
    if (value >= 80)
      return { label: "Stable Neural Response", color: "#2e7d32" };
    if (value >= 60)
      return { label: "Developing Regulation", color: "#ed6c02" };
    if (value >= 40) return { label: "High Variability", color: "#d32f2f" };
    return { label: "Needs Strong Support", color: "#6a1b9a" };
  }

  useEffect(() => {
    async function load() {
      const manifest = await api.getManifest();

      const nsiRes = await api.getNSI(subjectId);
      if (nsiRes.nsi !== null && nsiRes.nsi !== undefined) {
        setNsi(nsiRes.nsi);
      } else {
        setNsi(null);
      }

      const subject = manifest.subjects.find((s: any) => s.id === subjectId);
      if (!subject) return;

      const preferSubjectModel =
        modelMode === "loso"
          ? false
          : modelMode === "subject"
          ? true
          : subject.sessions.length >= 3;

      const s: number[] = [];
      const ids: string[] = [];

      for (const sess of subject.sessions) {
        if (sess.score == null) continue;

        s.push(sess.score);
        ids.push(sess.session_id);
      }

      setScores(s);
      setSessions(ids);

      try {
        const rec = await api.getRecommendation(subjectId);
        setRecommendation(rec);
      } catch {
        setRecommendation(null); // <3 sessions or unavailable
      }
    }

    load().catch(console.error);
  }, [subjectId, modelMode]);

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
          Your Child&apos;s Therapy Progress
        </Text>

        {/* DEV ONLY: Model selection override */}
        <View
          style={{
            marginTop: 12,
            marginBottom: 12,
            padding: 12,
            borderRadius: 10,
            backgroundColor: "#fff3cd",
            borderWidth: 1,
            borderColor: "#ffe69c",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#664d03" }}>
            Dev Mode — Model Override
          </Text>

          <View style={{ flexDirection: "row", marginTop: 8 }}>
            {["auto", "loso", "subject"].map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setModelMode(mode as any)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  marginRight: 8,
                  backgroundColor: modelMode === mode ? "#4f7cff" : "#e0e7ff",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: modelMode === mode ? "#fff" : "#1e3a8a",
                  }}
                >
                  {mode.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

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

        {/* NSI */}
        {nsi !== null && (
          <View
            style={{
              marginTop: 24,
              padding: 16,
              borderRadius: 12,
              backgroundColor: "#eef2ff",
              borderWidth: 1,
              borderColor: "#c7d2fe",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#3730a3" }}>
              Neural Response Stability Index (NSI)
            </Text>

            {(() => {
              const info = interpretNSI(nsi);
              return (
                <>
                  <Text
                    style={{
                      marginTop: 8,
                      fontSize: 36,
                      fontWeight: "800",
                      color: info.color,
                    }}
                  >
                    {nsi}
                  </Text>

                  <Text
                    style={{
                      marginTop: 4,
                      fontWeight: "600",
                      color: info.color,
                    }}
                  >
                    {info.label}
                  </Text>
                </>
              );
            })()}

            <Text
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "#555",
                lineHeight: 16,
              }}
            >
              NSI reflects how stable and adaptable your child&apos;s neural
              responses are across multiple therapy sessions. It is a
              non-clinical, progress-tracking indicator.
            </Text>
          </View>
        )}

        {/* GAME */}
        {recommendation && (
          <View
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              backgroundColor: "#eef2ff",
              borderWidth: 1,
              borderColor: "#c7d2fe",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1e3a8a" }}>
              Recommended Next Activity
            </Text>

            <Text
              style={{
                marginTop: 8,
                fontSize: 20,
                fontWeight: "800",
                color: "#3730a3",
              }}
            >
              {recommendation.game_name}
            </Text>

            <Text
              style={{
                marginTop: 10,
                fontWeight: "600",
                fontSize: 14,
              }}
            >
              Why this activity?
            </Text>

            {recommendation.explanations?.map((e: string, i: number) => (
              <Text
                key={i}
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: "#333",
                }}
              >
                • {e}
              </Text>
            ))}

            <View
              style={{
                marginTop: 10,
                alignSelf: "flex-start",
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: "#4f7cff",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>
                MODE: {recommendation.mode.toUpperCase()}
              </Text>
            </View>
          </View>
        )}

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
