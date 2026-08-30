import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '../components/AppHeader';
import { DestinationCard } from '../components/DestinationCard';
import { SectionHeader } from '../components/SectionHeader';
import type { DestinationPack } from '../data/destinations';
import { useFeedback } from '../feedback/FeedbackProvider';
import { colors, layout, radius, spacing } from '../theme';

type Props = {
  packs: DestinationPack[];
  onDownloadPack: (packId: string) => Promise<void>;
  onRemovePack: (packId: string) => Promise<void>;
};

export function DownloadsScreen({ packs, onDownloadPack, onRemovePack }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const { showSnackbar } = useFeedback();
  const downloaded = packs.filter((pack) => pack.downloaded);
  const available = packs.filter((pack) => pack.status === 'available' && !pack.downloaded);
  const usedMb = downloaded.reduce((total, pack) => total + (Number.parseFloat(pack.sizeLabel) || 0), 0);

  const runAction = async (pack: DestinationPack) => {
    setBusyId(pack.id);
    try {
      if (pack.downloaded) {
        await onRemovePack(pack.id);
        showSnackbar({ message: `${pack.name} removed from this device.`, tone: 'info' });
      } else {
        await onDownloadPack(pack.id);
        showSnackbar({ message: `${pack.name} saved to your offline library.`, tone: 'success' });
      }
    } catch {
      showSnackbar({ message: 'The offline library could not be updated. Please try again.', tone: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader compact />

      <View>
        <Text style={styles.title}>Downloads</Text>
        <Text style={styles.subtitle}>Manage destination content available without internet.</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons name="phone-portrait-outline" size={22} color={colors.forest} />
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>Offline library</Text>
          <Text style={styles.summaryText}>{downloaded.length} {downloaded.length === 1 ? 'pack' : 'packs'} saved • {usedMb} MB used</Text>
        </View>
        <View style={styles.readyPill}>
          <View style={styles.readyDot} />
          <Text style={styles.readyText}>Ready</Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="On this device" title="Downloaded packs" />
        <View style={styles.list}>
          {downloaded.length ? downloaded.map((pack) => (
            <DestinationCard
              key={pack.id}
              pack={pack}
              compact
              actionLabel={busyId === pack.id ? 'Removing…' : 'Remove'}
              actionDisabled={busyId !== null}
              onAction={() => void runAction(pack)}
            />
          )) : (
            <Text style={styles.emptyText}>No destination packs are currently saved on this device.</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="When connected" title="Available to download" />
        <View style={styles.list}>
          {available.length ? available.map((pack) => (
            <DestinationCard
              key={pack.id}
              pack={pack}
              compact
              actionLabel={busyId === pack.id ? 'Saving…' : 'Download'}
              actionDisabled={busyId !== null}
              onAction={() => void runAction(pack)}
            />
          )) : (
            <Text style={styles.emptyText}>All currently available packs are saved offline.</Text>
          )}
        </View>
      </View>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={17} color={colors.muted} />
        <Text style={styles.noteText}>Downloaded packs are stored in the app's local library so their offline-ready state remains available after restarting LakbayLokal.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  subtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12.5,
  },
  summaryCard: {
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
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    color: colors.forestDark,
    fontSize: 13.5,
    fontWeight: '800',
  },
  summaryText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11.3,
  },
  readyPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.forest,
  },
  readyText: {
    color: colors.forest,
    fontSize: 9.5,
    fontWeight: '900',
  },
  section: {
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  emptyText: {
    paddingVertical: spacing.md,
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 16,
  },
  note: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#F1EEE7',
  },
  noteText: {
    flex: 1,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
});
