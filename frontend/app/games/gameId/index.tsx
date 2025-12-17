import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function GamePlaceholder() {
  const { gameId } = useLocalSearchParams();

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>
        Activity: {gameId}
      </Text>

      <Text style={{ marginTop: 12, color: "#555" }}>
        This is a placeholder for the interactive therapy game.
      </Text>

      <Text style={{ marginTop: 10, fontSize: 12, color: "#777" }}>
        During the demo, attention responses are simulated using EEG-derived
        session data.
      </Text>
    </View>
  );
}
