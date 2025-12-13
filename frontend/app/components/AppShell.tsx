import { View } from "react-native";
import HeaderBar from "./HeaderBar";
import BottomBar from "./BottomBar";
import { useAuth } from "@/app/context/AuthContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { subjectId } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <HeaderBar childName={subjectId} />

      <View style={{ flex: 1 }}>{children}</View>

      <BottomBar />
    </View>
  );
}
