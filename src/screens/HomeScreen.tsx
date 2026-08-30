import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '../components/AppHeader';
import { DestinationCard } from '../components/DestinationCard';
import { SearchField } from '../components/SearchField';
import { SectionHeader } from '../components/SectionHeader';
import type { DestinationPack } from '../data/destinations';
import { colors, layout, radius, spacing } from '../theme';
import type { TabKey } from '../types/navigation';

type Props = {
  packs: DestinationPack[];
  onNavigate: (tab: TabKey) => void;
};

export function HomeScreen({ packs, onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const featured = packs.filter((pack) => pack.featured).slice(0, 3);
  const downloaded = packs.filter((pack) => pack.downloaded);
  const firstDownloaded = downloaded[0];

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader compact />

      <View style={styles.intro}>
        <Text style={styles.eyebrow}>DAVAO DEL NORTE</Text>
        <Text style={styles.title}>Explore confidently, even beyond the signal.</Text>
        <Text style={styles.subtitle}>Prepare local destination packs before your trip and keep essential travel information on-device.</Text>
      </View>

      <SearchField value={query} onChangeText={setQuery} placeholder="Search destination packs" />

      <Pressable style={({ pressed }) => [styles.readiness, pressed && styles.pressed]} onPress={() => onNavigate('downloads')}>
        <View style={styles.readinessIcon}>
          <Ionicons name="cloud-done-outline" size={21} color={colors.forest} />
        </View>
        <View style={styles.readinessCopy}>
          <Text style={styles.readinessTitle}>{downloaded.length} {downloaded.length === 1 ? 'pack' : 'packs'} ready offline</Text>
          <Text style={styles.readinessText}>
            {firstDownloaded ? `${firstDownloaded.name} is saved on this device.` : 'Download a destination pack before heading offline.'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.forest} />
      </Pressable>

      <View style={styles.section}>
        <SectionHeader eyebrow="Recommended" title="Start with these packs" actionLabel="Explore all" onAction={() => onNavigate('explore')} />
        <View style={styles.list}>
          {featured.map((pack) => <DestinationCard key={pack.id} pack={pack} compact />)}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Simple flow" title="How LakbayLokal works" />
        <View style={styles.flowCard}>
          <FlowStep icon="download-outline" number="01" title="Download" text="Save the destination pack." />
          <View style={styles.flowDivider} />
          <FlowStep icon="cloud-offline-outline" number="02" title="Go offline" text="Keep local content available." />
          <View style={styles.flowDivider} />
          <FlowStep icon="navigate-outline" number="03" title="Follow" text="Use saved trails with GPS." />
        </View>
      </View>
    </ScrollView>
  );
}

type FlowStepProps = {
  icon: 'download-outline' | 'cloud-offline-outline' | 'navigate-outline';
  number: string;
  title: string;
  text: string;
};

function FlowStep({ icon, number, title, text }: FlowStepProps) {
  return (
    <View style={styles.flowStep}>
      <View style={styles.flowIcon}><Ionicons name={icon} size={18} color={colors.forest} /></View>
      <Text style={styles.flowNumber}>{number}</Text>
      <Text style={styles.flowTitle}>{title}</Text>
      <Text style={styles.flowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  intro: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.orange,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  title: {
    maxWidth: 560,
    color: colors.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.9,
  },
  subtitle: {
    maxWidth: 600,
    color: colors.muted,
    fontSize: 13.2,
    lineHeight: 19,
  },
  readiness: {
    minHeight: 72,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#C9DDCC',
    backgroundColor: colors.softGreen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  readinessIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readinessCopy: {
    flex: 1,
  },
  readinessTitle: {
    color: colors.forestDark,
    fontSize: 13.5,
    fontWeight: '800',
  },
  readinessText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11.3,
    lineHeight: 15,
  },
  section: {
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  flowCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    padding: spacing.md,
  },
  flowStep: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xs,
  },
  flowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  flowNumber: {
    color: colors.orange,
    fontSize: 9,
    fontWeight: '900',
  },
  flowTitle: {
    marginTop: 2,
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '800',
  },
  flowText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 14,
  },
  flowDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 3,
  },
  pressed: {
    opacity: 0.8,
  },
});
