import { View, Text } from "react-native";

type TrendPoint = {
  sessionId: string;
  value: number; // AUC or meanProb
};

export default function SessionTrend({ data }: { data: TrendPoint[] }) {
  if (data.length < 2) return null;

  return (
    <View style={{ marginTop: 20 }}>
      <Text style={{ fontWeight: "600", marginBottom: 10 }}>
        Training Progress
      </Text>

      {data.map((d, i) => {
        const prev = data[i - 1]?.value;
        const delta = prev !== undefined ? d.value - prev : 0;

        const color =
          d.value >= 0.7 ? "#2e7d32" : d.value >= 0.6 ? "#ed6c02" : "#d32f2f";

        const arrow = delta > 0.02 ? "↑" : delta < -0.02 ? "↓" : "→";

        return (
          <View key={d.sessionId} style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: "600" }}>
              {d.sessionId} {arrow}
            </Text>

            {/* Progress bar */}
            <View
              style={{
                height: 10,
                backgroundColor: "#eee",
                borderRadius: 5,
                marginTop: 4,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${Math.min(d.value * 100, 100)}%`,
                  backgroundColor: color,
                  height: "100%",
                }}
              />
            </View>

            <Text style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
              Score: {d.value.toFixed(3)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
