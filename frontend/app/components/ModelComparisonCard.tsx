import { View, Text } from "react-native";

export default function ModelComparisonCard({ data }: { data: any }) {
  const deltaPct = Math.round(data.delta * 100);

  return (
    <View
      style={{
        marginTop: 24,
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#fff7ed",
        borderWidth: 1,
        borderColor: "#fed7aa",
      }}
    >
      <Text style={{ fontWeight: "700", fontSize: 16 }}>
        Research Mode — Model Comparison
      </Text>

      {/* LOSO */}
      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: "600" }}>LOSO Model</Text>
        <Text style={{ color: "#555" }}>
          Score: {Math.round(data.loso.score * 100)}%
        </Text>
        <Text style={{ color: "#555" }}>
          Confidence: {Math.round(data.loso.confidence * 100)}%
        </Text>
      </View>

      {/* SUBJECT */}
      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: "600" }}>Subject-Specific Model</Text>
        <Text style={{ color: "#555" }}>
          Score: {Math.round(data.subject.score * 100)}%
        </Text>
        <Text style={{ color: "#555" }}>
          Confidence: {Math.round(data.subject.confidence * 100)}%
        </Text>
      </View>

      {/* DELTA */}
      <View style={{ marginTop: 12 }}>
        <Text
          style={{
            fontWeight: "700",
            color: deltaPct >= 0 ? "#15803d" : "#b91c1c",
          }}
        >
          Δ Improvement: {deltaPct > 0 ? "+" : ""}
          {deltaPct}%
        </Text>

        <Text style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          Subject-specific model shows improved personalization and stability.
        </Text>
      </View>
    </View>
  );
}
