import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import Slider from "@react-native-community/slider";
import { api, BASE_URL } from "@/app/services/api";
import { aggregateP300 } from "@/app/utils/p300";

export default function PredictionScreen() {
  const { subjectId, sessionId } = useLocalSearchParams<{
    subjectId: string;
    sessionId: string;
  }>();

  const [probs, setProbs] = useState<number[]>([]);
  const [auc, setAuc] = useState<number | null>(null);
  const [threshold, setThreshold] = useState(0.5);
  const [blockResults, setBlockResults] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const pred = await api.getPrediction(subjectId!, sessionId!);
      setProbs(pred.probs);
      setAuc(pred.auc ?? null);

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

  // simple stats
  const stats = useMemo(() => {
    if (!probs.length) return null;
    const above = probs.filter((p) => p >= threshold).length;
    const below = probs.length - above;
    return { above, below };
  }, [probs, threshold]);

  if (!probs.length) {
    return (
      <View style={{ padding: 16 }}>
        <Text>Loading predictions...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>
        Prediction Inspector
      </Text>

      <Text style={{ marginTop: 8 }}>
        Subject: {subjectId} · Session: {sessionId}
      </Text>

      {auc !== null && (
        <Text style={{ marginTop: 6 }}>
          Model AUC: <Text style={{ fontWeight: "600" }}>{auc.toFixed(3)}</Text>
        </Text>
      )}

      {/* Threshold */}
      <View style={{ marginTop: 20 }}>
        <Text style={{ marginBottom: 4 }}>
          Decision Threshold: {threshold.toFixed(2)}
        </Text>
        <Slider
          minimumValue={0}
          maximumValue={1}
          step={0.01}
          value={threshold}
          onValueChange={setThreshold}
        />
      </View>

      {/* Distribution */}
      <View style={{ marginTop: 20 }}>
        <Text style={{ fontWeight: "600", marginBottom: 6 }}>
          Probability Distribution
        </Text>

        <View
          style={{
            height: 24,
            flexDirection: "row",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flex: stats?.below ?? 0,
              backgroundColor: "#ddd",
            }}
          />
          <View
            style={{
              flex: stats?.above ?? 0,
              backgroundColor: "#4f7cff",
            }}
          />
        </View>

        <Text style={{ marginTop: 6, color: "#555" }}>
          Below threshold: {stats?.below} trials
        </Text>
        <Text style={{ color: "#555" }}>
          Above threshold: {stats?.above} trials
        </Text>
      </View>

      {/* Sample predictions */}
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontWeight: "600", marginBottom: 6 }}>
          Sample Predictions
        </Text>

        {probs.slice(0, 12).map((p, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 6,
              borderBottomWidth: 0.5,
              borderColor: "#ddd",
            }}
          >
            <Text>Trial {i + 1}</Text>
            <Text
              style={{
                color: p >= threshold ? "#4f7cff" : "#777",
                fontWeight: p >= threshold ? "600" : "400",
              }}
            >
              {p.toFixed(3)}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 28 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
          Block-level Decisions
        </Text>

        {blockResults.slice(0, 10).map((b) => (
          <View
            key={b.block}
            style={{
              padding: 10,
              borderRadius: 6,
              backgroundColor: "#f4f6ff",
              marginBottom: 8,
            }}
          >
            <Text>Block {b.block}</Text>
            <Text style={{ fontWeight: "600", marginTop: 4 }}>
              Predicted Object: {b.predictedObject}
            </Text>
            <Text style={{ marginTop: 2, color: "#555" }}>
              Confidence: {Math.max(...b.averages).toFixed(3)}
            </Text>
          </View>
        ))}

        {blockResults.length > 10 && (
          <Text style={{ color: "#666", marginTop: 6 }}>
            Showing first 10 of {blockResults.length} blocks
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
