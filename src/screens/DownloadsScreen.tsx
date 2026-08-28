import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '../components/AppHeader';
import { DestinationCard } from '../components/DestinationCard';
import { SectionHeader } from '../components/SectionHeader';
import { destinationPacks } from '../data/destinations';
import { colors, layout, radius, spacing } from '../theme';

export function DownloadsScreen() {
  const downloaded = destinationPacks.filter((pack) => pack.downloaded);
  const available = destinationPacks.filter((pack) => pack.status === 'available' && !pack.downloaded);

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
          <Text style={styles.summaryText}>{downloaded.length} pack saved • 42 MB used</Text>
        </View>
        <View style={styles.readyPill}>
          <View style={styles.readyDot} />
          <Text style={styles.readyText}>Ready</Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="On this device" title="Downloaded packs" />
        <View style={styles.list}>
          {downloaded.map((pack) => <DestinationCard key={pack.id} pack={pack} compact />)}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="When connected" title="Available to download" />
        <View style={styles.list}>
          {available.map((pack) => <DestinationCard key={pack.id} pack={pack} compact />)}
        </View>
      </View>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={17} color={colors.muted} />
        <Text style={styles.noteText}>Downloaded packs are designed to keep destination details, local trails, and safety notes available offline.</Text>
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
