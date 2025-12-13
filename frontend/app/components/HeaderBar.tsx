import { View, Text, Image } from "react-native";

type HeaderBarProps = {
  childName: string;
};

export default function HeaderBar({ childName }: HeaderBarProps) {
  return (
    <View
      style={{
        paddingTop: 40,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: "#ffffff",
        borderBottomWidth: 1,
        borderColor: "#eef0f5",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {/* Logo placeholder */}
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: "#4f7cff",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>N</Text>
        </View>

        <View>
          <Text style={{ fontSize: 16, fontWeight: "700" }}>NeuroSense</Text>
          <Text style={{ fontSize: 12, color: "#666" }}>
            Child: {childName}
          </Text>
        </View>
      </View>
    </View>
  );
}
