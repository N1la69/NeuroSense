import { View, Text } from "react-native";

type Props = {
  averages: number[];
  predicted: number;
};

export default function ObjectConfidenceBars({ averages, predicted }: Props) {
  const max = Math.max(...averages);

  return (
    <View style={{ marginTop: 6 }}>
      {averages.map((v, i) => {
        const isPredicted = i + 1 === predicted;

        return (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <Text style={{ width: 24 }}>#{i + 1}</Text>

            <View
              style={{
                flex: 1,
                height: 10,
                backgroundColor: "#ddd",
                borderRadius: 4,
                overflow: "hidden",
                marginHorizontal: 6,
              }}
            >
              <View
                style={{
                  width: `${(v / max) * 100}%`,
                  height: "100%",
                  backgroundColor: isPredicted ? "#4f7cff" : "#999",
                }}
              />
            </View>

            <Text style={{ width: 48 }}>{v.toFixed(2)}</Text>
          </View>
        );
      })}
    </View>
  );
}
