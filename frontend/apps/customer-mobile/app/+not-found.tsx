import { router } from "expo-router";
import { View } from "react-native";
import { useI18n } from "../src/i18n";
import { space } from "../src/theme";
import { EmptyState, Header, Screen } from "../src/ui";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <Screen>
      <Header title="ZhaoXi" />
      <View style={{ padding: space.lg }}>
        <EmptyState icon="compass-outline" title={t.search.empty} action={t.success.home} onAction={() => router.replace("/")} />
      </View>
    </Screen>
  );
}
