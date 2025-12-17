//frontend/app/sessions/[subjectId]/[sessionId]/index.tsx

import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { api, BASE_URL } from "@/app/services/api";
import { aggregateP300 } from "@/app/utils/p300";
import ObjectConfidenceBars from "@/app/components/ObjectConfidenceBars";
import AppShell from "@/app/components/AppShell";

import { useAuth } from "@/app/context/AuthContext";

function interpretSessionScore(scorePct: number) {
  if (scorePct >= 70) {
    return {
      title: "Strong Attention Response",
      summary:
        "Your child showed strong and consistent attention during this session.",
      color: "#4f7cff",
    };
  }

  if (scorePct >= 55) {
    return {
      title: "Developing Attention",
      summary:
        "Your child showed improving focus. This is a positive step in therapy.",
      color: "#ed6c02",
    };
  }

  return {
    title: "Needs Support",
    summary:
      "This session was more challenging. This is normal and part of learning.",
    color: "#d32f2f",
  };
}

export default function SessionScreen() {
  const { modelMode } = useAuth();

  const { subjectId, sessionId } = useLocalSearchParams<{
    subjectId: string;
    sessionId: string;
  }>();

  const [probs, setProbs] = useState<number[]>([]);
  const [blockResults, setBlockResults] = useState<any[]>([]);
  const [recommendedGame, setRecommendedGame] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const manifest = await api.getManifest();
      const subject = manifest.subjects.find((s: any) => s.id === subjectId);
      if (!subject) return;

      const preferSubjectModel =
        modelMode === "loso"
          ? false
          : modelMode === "subject"
          ? true
          : subject.sessions.length >= 3;

      const pred = await api.getPrediction(
        subjectId!,
        sessionId!,
        preferSubjectModel
      );
      setProbs(pred.probs);

      const recRes = await fetch(`${BASE_URL}/recommend/next/${subjectId}`);
      if (recRes.ok) {
        const rec = await recRes.json();
        setRecommendedGame(rec);
      }

      if (recommendedGame?.game_id) {
        await fetch(`${BASE_URL}/game/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject_id: subjectId,
            session_id: sessionId,
            game_id: recommendedGame.game_id,
          }),
        });
      }

      const metaRes = await fetch(
        `${BASE_URL}/data/${subjectId}/${sessionId}/test`
      );
      const meta = await metaRes.json();

      const blocks = aggregateP300(
        pred.probs,
        meta.events,
        meta.runs_per_block
      );

      setBlockResults(blocks);
    }

    load().catch(console.error);
  }, [subjectId, sessionId, modelMode]);

  const scorePct = useMemo(() => {
    if (!probs.length) return null;
    return Math.round((probs.reduce((a, b) => a + b, 0) / probs.length) * 100);
  }, [probs]);

  if (scorePct === null) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Loading session report…</Text>
      </View>
    );
  }

  const interpretation = interpretSessionScore(scorePct);
  //console.log("RECOMMENDED GAME:", recommendedGame);

  // Aggregate object preference
  const objectSummary = useMemo(() => {
    if (!blockResults.length) return null;

    const counts: Record<number, number> = {};
    blockResults.forEach((b) => {
      counts[b.predictedObject] = (counts[b.predictedObject] || 0) + 1;
    });

    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? Number(top[0]) : null;
  }, [blockResults]);

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <Text style={{ fontSize: 20, fontWeight: "700" }}>
          Therapy Session Report
        </Text>
        <Text style={{ marginTop: 4, color: "#666" }}>
          Session {sessionId?.replace("S", "")}
        </Text>

        {/* BIG RESULT CARD */}
        <View
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 14,
            backgroundColor: "#f6f8ff",
          }}
        >
          <Text style={{ fontSize: 14, color: "#666" }}>
            Attention Response Level
          </Text>
          <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Based on how consistently your child responded during activities
          </Text>

          <Text
            style={{
              fontSize: 42,
              fontWeight: "800",
              marginTop: 6,
              color: interpretation.color,
            }}
          >
            {scorePct}%
          </Text>

          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: interpretation.color,
              marginTop: 4,
            }}
          >
            {interpretation.title}
          </Text>

          <Text style={{ marginTop: 8, color: "#444" }}>
            {interpretation.summary}
          </Text>

          <Text
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#666",
              lineHeight: 16,
            }}
          >
            This score reflects your child&apos;s responses during this specific
            session. Overall progress is best seen across multiple sessions.
          </Text>
        </View>

        {/* CONSISTENCY BAR */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            Response Consistency
          </Text>

          <View
            style={{
              height: 12,
              borderRadius: 6,
              backgroundColor: "#e0e7ff",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${scorePct}%`,
                height: "100%",
                backgroundColor: interpretation.color,
              }}
            />
          </View>

          <Text style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
            Higher consistency means your child responded more reliably during
            activities
          </Text>

          <Text
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#777",
              lineHeight: 16,
            }}
          >
            It&apos;s normal for attention levels to vary from session to
            session. Progress is measured over time, not by a single day.
          </Text>
        </View>

        {/* WHAT WORKED BEST */}
        {objectSummary !== null && (
          <View style={{ marginTop: 28 }}>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>
              What Worked Best
            </Text>

            <Text style={{ marginTop: 6, color: "#555" }}>
              Your child responded most consistently to visual option #
              {objectSummary}.
            </Text>
          </View>
        )}

        {recommendedGame && (
          <View style={{ marginTop: 28 }}>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>
              Recommended Next Activity
            </Text>

            <View
              style={{
                marginTop: 8,
                padding: 14,
                borderRadius: 10,
                backgroundColor: "#eef2ff",
              }}
            >
              <Text style={{ fontWeight: "700" }}>
                {recommendedGame.game_name}
              </Text>

              <Text style={{ marginTop: 4, color: "#555", fontSize: 13 }}>
                {recommendedGame.reason}
              </Text>
            </View>
          </View>
        )}

        {/* SIMPLIFIED ACTIVITY VISUALS */}
        {blockResults.length > 0 && (
          <View style={{ marginTop: 28 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
              Activity Summary
            </Text>
            <Text style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              Below is a simple breakdown of how your child responded during
              different parts of the session.
            </Text>

            {blockResults.slice(0, 3).map((b) => (
              <View
                key={b.block}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: "#f4f6ff",
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontWeight: "600", marginBottom: 6 }}>
                  Activity {b.block}
                </Text>

                <ObjectConfidenceBars
                  averages={b.averages}
                  predicted={b.predictedObject}
                />
              </View>
            ))}

            <Text style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              Showing key activities only
            </Text>
          </View>
        )}
      </ScrollView>
    </AppShell>
  );
}
