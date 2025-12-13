import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import Slider from "@react-native-community/slider";
import { api } from "@/app/services/api";

export default function PredictionScreen() {
  const { subjectId, sessionId } = useLocalSearchParams<{
    subjectId: string;
    sessionId: string;
  }>();

  const [probs, setProbs] = useState<number[]>([]);
  const [auc, setAuc] = useState<number | null>(null);
  const [threshold, setThreshold] = useState(0.5);

  useEffect(() => {
    api
      .getPrediction(subjectId!, sessionId!)
      .then((res) => {
        setProbs(res.probs);
        setAuc(res.auc ?? null);

        // sensible initial threshold = mean probability
        if (res.probs?.length) {
          const mean =
            res.probs.reduce((a: number, b: number) => a + b, 0) /
            res.probs.length;
          setThreshold(Number(mean.toFixed(2)));
        }
      })
      .catch(console.error);
  }, []);

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
    </ScrollView>
  );
}
