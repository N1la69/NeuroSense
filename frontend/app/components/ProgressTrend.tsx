import { View, Text } from "react-native";

export default function ProgressTrend({ scores }: { scores: number[] }) {
  const percents = scores.map((s) => Math.round(s * 100));
  const max = Math.max(...percents);

  return (
    <View>
      <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
        Progress Across Sessions
      </Text>

      {/* Axis labels */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 12, color: "#666" }}>Focus Level</Text>
      </View>

      {/* Bars */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          height: 100,
          marginTop: 8,
        }}
      >
        {percents.map((p, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              marginHorizontal: 6,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 11, marginBottom: 4 }}>{p}%</Text>

            <View
              style={{
                height: `${(p / max) * 100}%`,
                width: "100%",
                backgroundColor: p >= 65 ? "#4f7cff" : "#c7d2fe",
                borderRadius: 6,
              }}
            />
          </View>
        ))}
      </View>

      <Text style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
        Each bar shows how consistently your child responded during a session
      </Text>
    </View>
  );
}
