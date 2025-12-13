import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { api, BASE_URL } from "@/app/services/api";
import { aggregateP300 } from "@/app/utils/p300";
import ObjectConfidenceBars from "@/app/components/ObjectConfidenceBars";

function interpretSessionScore(score: number) {
  if (score >= 0.7) {
    return {
      title: "Great Session 👍",
      summary:
        "Your child showed strong attention and responded very well during this session.",
      color: "#2e7d32",
    };
  }

  if (score >= 0.6) {
    return {
      title: "Good Progress 🙂",
      summary:
        "Your child is learning to focus better. This session showed encouraging improvement.",
      color: "#ed6c02",
    };
  }

  return {
    title: "Practice Needed 💙",
    summary:
      "This session was challenging, which is normal. Continued sessions will help build attention.",
    color: "#d32f2f",
  };
}

export default function SessionScreen() {
  const { subjectId, sessionId } = useLocalSearchParams<{
    subjectId: string;
    sessionId: string;
  }>();

  const [probs, setProbs] = useState<number[]>([]);
  const [blockResults, setBlockResults] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const pred = await api.getPrediction(subjectId!, sessionId!);
      setProbs(pred.probs);

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
  }, [subjectId, sessionId]);

  const score = useMemo(() => {
    if (!probs.length) return null;
    return probs.reduce((a, b) => a + b, 0) / probs.length;
  }, [probs]);

  if (!score) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Loading session details…</Text>
      </View>
    );
  }

  const interpretation = interpretSessionScore(score);

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
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      {/* Header */}
      <Text style={{ fontSize: 22, fontWeight: "700" }}>
        Today’s Training Session
      </Text>

      {/* Overall Result */}
      <View
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 10,
          backgroundColor: "#f5f7ff",
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: interpretation.color,
          }}
        >
          {interpretation.title}
        </Text>

        <Text style={{ marginTop: 6, color: "#555" }}>
          {interpretation.summary}
        </Text>
      </View>

      {/* What Worked Best */}
      {objectSummary !== null && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>
            What Worked Best
          </Text>

          <Text style={{ marginTop: 6, color: "#555" }}>
            Your child responded most consistently to visual option #
            {objectSummary}.
          </Text>
        </View>
      )}

      {/* Visual Explanation */}
      {blockResults.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
            Attention Across Activities
          </Text>

          {blockResults.slice(0, 5).map((b) => (
            <View
              key={b.block}
              style={{
                padding: 12,
                borderRadius: 8,
                backgroundColor: "#f4f6ff",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontWeight: "600", marginBottom: 6 }}>
                Activity Round {b.block}
              </Text>

              <ObjectConfidenceBars
                averages={b.averages}
                predicted={b.predictedObject}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
