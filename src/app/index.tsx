import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { globalStyles } from '@/constants/globals';
import { useActiveSetupConfig } from '@/hooks/use-active-setup-config';
import { StyleSheet } from 'react-native';

export default function Index() {
  const { appVariant, setupType } = useActiveSetupConfig();
  return (
    <ThemedView style={[globalStyles.centeredContainer, styles.screen]}>
      <ThemedText>TenantKit</ThemedText>
      <ThemedText>Setup Type: {setupType}</ThemedText>
      <ThemedText>App Variant: {appVariant.id}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 12,
  },
});
