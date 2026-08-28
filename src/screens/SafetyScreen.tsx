import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '../components/AppHeader';
import { SectionHeader } from '../components/SectionHeader';
import { colors, layout, radius, spacing } from '../theme';

const checklist = [
  ['Download your destination pack', 'download-outline'],
  ['Charge your phone before leaving', 'battery-charging-outline'],
  ['Tell someone your planned route', 'people-outline'],
  ['Keep local emergency details saved', 'document-text-outline'],
] as const;

export function SafetyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader compact />

      <View>
        <Text style={styles.title}>Safety</Text>
        <Text style={styles.subtitle}>Offline travel preparation and essential local guidance.</Text>
      </View>

      <View style={styles.emergencyCard}>
        <View style={styles.emergencyIcon}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.danger} />
        </View>
        <View style={styles.emergencyCopy}>
          <Text style={styles.emergencyTitle}>Emergency information</Text>
          <Text style={styles.emergencyText}>Keep official local emergency contacts inside downloaded packs. Call 911 when service is available.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Before leaving" title="Offline-ready checklist" />
        <View style={styles.checklistCard}>
          {checklist.map(([label, icon], index) => (
            <View key={label} style={[styles.checkRow, index < checklist.length - 1 && styles.checkRowBorder]}>
              <View style={styles.checkIcon}><Ionicons name={icon} size={17} color={colors.forest} /></View>
              <Text style={styles.checkText}>{label}</Text>
              <Ionicons name="checkmark-circle" size={18} color={colors.forest} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Saved offline" title="Essential information" />
        <View style={styles.grid}>
          <SafetyTile icon="medical-outline" title="Medical" text="Nearest known facilities" />
          <SafetyTile icon="call-outline" title="Contacts" text="Local emergency numbers" />
          <SafetyTile icon="navigate-outline" title="Route" text="Saved trail references" />
          <SafetyTile icon="information-circle-outline" title="Advisories" text="Destination reminders" />
        </View>
      </View>

      <View style={styles.guidance}>
        <Ionicons name="compass-outline" size={18} color={colors.orange} />
        <Text style={styles.guidanceText}>LakbayLokal supports preparation and navigation but does not replace local guides, official advisories, or emergency services.</Text>
      </View>
    </ScrollView>
  );
}

type SafetyTileProps = {
  icon: 'medical-outline' | 'call-outline' | 'navigate-outline' | 'information-circle-outline';
  title: string;
  text: string;
};

function SafetyTile({ icon, title, text }: SafetyTileProps) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={19} color={colors.forest} />
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileText}>{text}</Text>
    </View>
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
  emergencyCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E8C5BD',
    backgroundColor: '#FFF7F5',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emergencyIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyCopy: {
    flex: 1,
  },
  emergencyTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '800',
  },
  emergencyText: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 11.2,
    lineHeight: 16,
  },
  section: {
    gap: spacing.sm,
  },
  checklistCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  checkRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  checkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: '48%',
    minHeight: 92,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  tileTitle: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 12.5,
    fontWeight: '800',
  },
  tileText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 14,
  },
  guidance: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.softOrange,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  guidanceText: {
    flex: 1,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
});
