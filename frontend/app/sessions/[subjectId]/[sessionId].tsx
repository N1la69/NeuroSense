import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function SessionScreen() {
  const { subjectId, sessionId } = useLocalSearchParams<{
    subjectId: string;
    sessionId: string;
  }>();
  const router = useRouter();
  const [pred, setPred] = useState<any>(null);

  useEffect(() => {
    api
      .getPrediction(subjectId!, sessionId!)
      .then(setPred)
      .catch(console.error);
  }, []);

  if (!pred) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>
        {subjectId} / {sessionId}
      </Text>

      <Text style={{ marginTop: 8 }}>Trials: {pred.n_trials}</Text>

      {pred.auc && (
        <Text style={{ marginTop: 4 }}>AUC: {pred.auc.toFixed(3)}</Text>
      )}

      <Pressable
        onPress={() =>
          router.push(`/sessions/${subjectId}/${sessionId}/predict` as any)
        }
        style={{
          marginTop: 20,
          padding: 14,
          backgroundColor: "#3366ff",
          borderRadius: 6,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          View Predictions
        </Text>
      </Pressable>
    </View>
  );
}
