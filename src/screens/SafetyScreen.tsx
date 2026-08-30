import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '../components/AppHeader';
import { SectionHeader } from '../components/SectionHeader';
import {
  listCompletedSafetyItems,
  resetSafetyChecklist,
  setSafetyItemCompleted,
} from '../storage/safetyStore';
import { colors, layout, radius, spacing } from '../theme';

const checklist = [
  { key: 'download-pack', label: 'Download your destination pack', icon: 'download-outline' },
  { key: 'charge-phone', label: 'Charge your phone before leaving', icon: 'battery-charging-outline' },
  { key: 'share-route', label: 'Tell someone your planned route', icon: 'people-outline' },
  { key: 'save-emergency', label: 'Keep local emergency details saved', icon: 'document-text-outline' },
] as const;

export function SafetyScreen() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void listCompletedSafetyItems()
      .then((keys) => {
        if (active) setCompleted(new Set(keys));
      })
      .catch(() => {
        if (active) setError('Your saved safety checklist could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const toggleItem = async (itemKey: string) => {
    const nextValue = !completed.has(itemKey);
    setError('');
    setCompleted((current) => {
      const next = new Set(current);
      if (nextValue) next.add(itemKey);
      else next.delete(itemKey);
      return next;
    });

    try {
      await setSafetyItemCompleted(itemKey, nextValue);
    } catch {
      setCompleted((current) => {
        const next = new Set(current);
        if (nextValue) next.delete(itemKey);
        else next.add(itemKey);
        return next;
      });
      setError('The checklist change could not be saved.');
    }
  };

  const resetChecklist = async () => {
    setError('');
    try {
      await resetSafetyChecklist();
      setCompleted(new Set());
    } catch {
      setError('The checklist could not be reset.');
    }
  };

  const completedCount = completed.size;

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

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          eyebrow="Before leaving"
          title={loading ? 'Loading checklist…' : `${completedCount}/${checklist.length} ready`}
          actionLabel={completedCount ? 'Reset' : undefined}
          onAction={completedCount ? () => void resetChecklist() : undefined}
        />
        <View style={styles.checklistCard}>
          {checklist.map((item, index) => {
            const checked = completed.has(item.key);
            return (
              <Pressable
                key={item.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => void toggleItem(item.key)}
                style={({ pressed }) => [
                  styles.checkRow,
                  index < checklist.length - 1 && styles.checkRowBorder,
                  checked && styles.checkRowCompleted,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.checkIcon, checked && styles.checkIconCompleted]}>
                  <Ionicons name={item.icon} size={17} color={colors.forest} />
                </View>
                <Text style={[styles.checkText, checked && styles.checkTextCompleted]}>{item.label}</Text>
                <Ionicons
                  name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={checked ? colors.forest : colors.muted}
                />
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.checklistHint}>Tap each item as you complete it. Your checklist is saved on this device.</Text>
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
  errorBox: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.softOrange,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 11.2,
    lineHeight: 15,
    fontWeight: '700',
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
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  checkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkRowCompleted: {
    backgroundColor: colors.softGreen,
  },
  checkIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconCompleted: {
    backgroundColor: colors.surface,
  },
  checkText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  checkTextCompleted: {
    color: colors.forestDark,
  },
  checklistHint: {
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 15,
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
  pressed: {
    opacity: 0.72,
  },
});
