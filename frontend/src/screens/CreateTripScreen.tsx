import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { MyTripSummary, PendingGroupInvite, StartupState } from '../services/startupState';
import { createTripWithGroup } from '../services/tripSetup';

export interface CreatedTripDetails {
  tripSessionId: string;
  groupId: string;
  groupName: string;
  title: string;
  origin: string;
  departureDate: string;
  returnDate: string;
  dateRange: string;
  travelers: number;
}

interface CreateTripScreenProps {
  startupState?: StartupState | null;
  pendingInvites?: PendingGroupInvite[];
  currentTrips?: MyTripSummary[];
  onAcceptInvite: (inviteCode: string) => Promise<void>;
  onRejectInvite: (inviteCode: string) => Promise<void>;
  onTripCreated: (trip: CreatedTripDetails) => void;
  onSignOut: () => void;
}

type TravelerBadge = {
  id: string;
  label: string;
  color: string;
};

const AVATAR_COLORS = ['#22C55E', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899'];
const WEB_DATE_INPUT_STYLE = {
  width: '100%',
  borderWidth: 1,
  borderColor: '#D4DBE6',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 18,
  backgroundColor: '#FFFFFF',
  color: '#111827',
  boxSizing: 'border-box',
} as any;

function normalizeDate(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function formatDateRange(departureDate: string, returnDate: string): string {
  if (!departureDate || !returnDate) return 'Select dates';

  const start = new Date(`${departureDate}T00:00:00`);
  const end = new Date(`${returnDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return `${departureDate} - ${returnDate}`;

  const startMonth = start.toLocaleDateString(undefined, { month: 'long' });
  const endMonth = end.toLocaleDateString(undefined, { month: 'long' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  return startMonth === endMonth
    ? `${startMonth} ${startDay} - ${endDay}`
    : `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

const DateInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webDateContainer}>
        {React.createElement('input', {
          type: 'date',
          value,
          onChange: (event: any) => onChange(event.target.value),
          style: WEB_DATE_INPUT_STYLE,
        })}
      </View>
    );
  }

  return (
    <TextInput
      style={styles.nativeDateInput}
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
};

export const CreateTripScreen: React.FC<CreateTripScreenProps> = ({
  startupState,
  pendingInvites = [],
  currentTrips = [],
  onAcceptInvite,
  onRejectInvite,
  onTripCreated,
  onSignOut,
}) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 980;
  const isMobile = width < 620;

  const initialTrip = startupState?.tripSession;
  const [origin, setOrigin] = useState(initialTrip?.origin || '');
  const [departureDate, setDepartureDate] = useState(normalizeDate(initialTrip?.departureDate));
  const [returnDate, setReturnDate] = useState(normalizeDate(initialTrip?.returnDate));
  const [invitePanelOpen, setInvitePanelOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteActionCode, setInviteActionCode] = useState<string | null>(null);
  const [inviteActionError, setInviteActionError] = useState<string | null>(null);

  const existingMemberBadges = useMemo<TravelerBadge[]>(() => {
    const members = startupState?.groupMembers || [];
    return members.map((member, index) => ({
      id: member.userId,
      label: (member.displayName || member.handle || '?').trim().charAt(0).toUpperCase(),
      color: AVATAR_COLORS[index % AVATAR_COLORS.length],
    }));
  }, [startupState]);

  const pendingInviteBadges = useMemo<TravelerBadge[]>(() => {
    return inviteEmails.map((email, index) => ({
      id: email,
      label: email.charAt(0).toUpperCase(),
      color: AVATAR_COLORS[(existingMemberBadges.length + index) % AVATAR_COLORS.length],
    }));
  }, [inviteEmails, existingMemberBadges.length]);

  const travelersCount = Math.max(1, existingMemberBadges.length || 1) + inviteEmails.length;
  const dateRangeLabel = formatDateRange(departureDate, returnDate);
  const canSubmit = Boolean(origin.trim() && departureDate && returnDate && returnDate > departureDate);

  const formatInviteExpiry = (expiresAt: string | null): string => {
    if (!expiresAt) return '';
    const value = new Date(expiresAt);
    if (Number.isNaN(value.getTime())) return '';
    return `Expires ${value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  };

  const handleAddInvite = () => {
    const normalized = inviteEmail.trim().toLowerCase();
    if (!normalized) return;
    if (!normalized.includes('@')) {
      setError('Invite email must be a valid email address.');
      return;
    }
    if (inviteEmails.includes(normalized)) {
      setInviteEmail('');
      return;
    }
    setInviteEmails((prev) => [...prev, normalized]);
    setInviteEmail('');
    setError(null);
  };

  const handleCreateTrip = async () => {
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);

    try {
      const normalizedOrigin = origin.trim();
      const groupName = `${normalizedOrigin} Travel Group`;
      const tripTitle = `${normalizedOrigin} Getaway`;
      const result = await createTripWithGroup({
        origin: normalizedOrigin,
        departureDate,
        returnDate,
        travelers: travelersCount,
        groupName,
        tripTitle,
        inviteEmails,
      });

      onTripCreated({
        tripSessionId: result.tripSessionId,
        groupId: result.groupId,
        groupName,
        title: tripTitle,
        origin: normalizedOrigin,
        departureDate,
        returnDate,
        dateRange: dateRangeLabel,
        travelers: travelersCount,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create trip.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitePress = async (inviteCode: string) => {
    if (inviteActionCode) return;
    setInviteActionCode(inviteCode);
    setInviteActionError(null);
    try {
      await onAcceptInvite(inviteCode);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept invite.';
      setInviteActionError(message);
    } finally {
      setInviteActionCode(null);
    }
  };

  const handleRejectInvitePress = async (inviteCode: string) => {
    if (inviteActionCode) return;
    setInviteActionCode(inviteCode);
    setInviteActionError(null);
    try {
      await onRejectInvite(inviteCode);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject invite.';
      setInviteActionError(message);
    } finally {
      setInviteActionCode(null);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.circleTopLeft} />
      <View style={styles.circleBottomRight} />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={onSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.planeRow}>
            <Text style={[styles.planeIcon, isMobile ? styles.planeIconMobile : null]}>✈</Text>
          </View>
          <Text style={[styles.title, isCompact ? styles.titleCompact : null, isMobile ? styles.titleMobile : null]}>
            PLAN YOUR PERFECT TRIP
          </Text>
          <View style={styles.titleUnderline} />
          <Text style={[styles.subtitle, isCompact ? styles.subtitleCompact : null]}>
            GROUP TRAVEL PLANNER · VOTE · COMPARE · EXPLORE
          </Text>

        <View style={styles.fieldsRow}>
          <View style={[styles.fieldCard, origin.trim() ? styles.completedCard : null]}>
            <Text style={styles.fieldLabel}>DEPARTURE</Text>
            <TextInput
              style={[styles.fieldInput, isMobile ? styles.fieldInputMobile : null]}
              value={origin}
              onChangeText={setOrigin}
              placeholder="From?"
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.fieldCard, canSubmit ? styles.completedCard : null]}>
            <Text style={styles.fieldLabel}>TRAVEL DATES</Text>
            <View style={styles.dateInputRow}>
              <DateInput value={departureDate} onChange={setDepartureDate} />
              <Text style={styles.dateDash}>→</Text>
              <DateInput value={returnDate} onChange={setReturnDate} />
            </View>
          </View>

          <Pressable
            style={[styles.fieldCard, styles.travelersCard, invitePanelOpen ? styles.travelersCardActive : null]}
            onPress={() => setInvitePanelOpen((prev) => !prev)}
          >
            <Text style={styles.fieldLabel}>TRAVELERS</Text>
            <View style={styles.travelersContent}>
              <View style={styles.avatarRow}>
                {[...existingMemberBadges, ...pendingInviteBadges].slice(0, 3).map((badge, index) => (
                  <View
                    key={badge.id}
                    style={[
                      styles.avatarBubble,
                      { backgroundColor: badge.color, marginLeft: index === 0 ? 0 : -8 },
                    ]}
                  >
                    <Text style={styles.avatarText}>{badge.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.inviteToggleText}>+ Invite friends</Text>
            </View>
          </Pressable>
        </View>

        {invitePanelOpen && (
          <View style={styles.invitePanel}>
            <View style={styles.inviteHeaderRow}>
              <Text style={styles.inviteLabel}>INVITE BY EMAIL</Text>
              <Text style={styles.inviteCount}>{travelersCount} travelers</Text>
            </View>
            <View style={styles.inviteInputRow}>
              <TextInput
                style={styles.inviteInput}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleAddInvite}
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleAddInvite}>
                <Text style={styles.sendButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.emailChipRow}>
              {inviteEmails.map((email) => (
                <View key={email} style={styles.emailChip}>
                  <Text style={styles.emailChipText}>{email}</Text>
                  <TouchableOpacity
                    onPress={() => setInviteEmails((prev) => prev.filter((item) => item !== email))}
                  >
                    <Text style={styles.removeInviteText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.exploreButton,
            isMobile ? styles.exploreButtonMobile : null,
            (!canSubmit || loading) ? styles.exploreButtonDisabled : null,
          ]}
          onPress={handleCreateTrip}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.exploreButtonText}>EXPLORE DESTINATIONS</Text>
          )}
        </TouchableOpacity>

        <View style={styles.pendingInvitesSection}>
          <View style={styles.pendingInvitesHeaderRow}>
            <Text style={styles.pendingInvitesTitle}>INVITATIONS</Text>
            <Text style={styles.pendingInvitesCount}>{pendingInvites.length}</Text>
          </View>

          {pendingInvites.length === 0 ? (
            <Text style={styles.emptyTripsText}>No pending invites right now.</Text>
          ) : (
            <View style={styles.pendingInvitesGrid}>
              {pendingInvites.slice(0, 6).map((invite) => {
                const inviter = invite.invitedByDisplayName || invite.invitedByHandle || 'A teammate';
                const inviteTrip = invite.trip;
                const actionLoading = inviteActionCode === invite.inviteCode;
                return (
                  <View key={invite.inviteCode} style={styles.pendingInviteCard}>
                    <Text style={styles.pendingInviteInviter}>
                      Invited by {inviter}
                    </Text>
                    <Text style={styles.pendingInviteGroup} numberOfLines={1}>
                      {invite.groupName}
                    </Text>
                    {inviteTrip ? (
                      <>
                        <Text style={styles.pendingInviteMeta} numberOfLines={1}>
                          {inviteTrip.title}
                        </Text>
                        <Text style={styles.pendingInviteMeta}>
                          {inviteTrip.origin} · {formatDateRange(normalizeDate(inviteTrip.departureDate), normalizeDate(inviteTrip.returnDate))}
                        </Text>
                        <Text style={styles.pendingInviteMeta}>
                          Travelers: {inviteTrip.travelers}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.pendingInviteMeta}>Trip details pending</Text>
                    )}
                    {invite.expiresAt ? (
                      <Text style={styles.pendingInviteExpiry}>{formatInviteExpiry(invite.expiresAt)}</Text>
                    ) : null}
                    <View style={styles.pendingInviteActionsRow}>
                      <TouchableOpacity
                        style={[styles.pendingInviteAcceptButton, actionLoading ? styles.pendingInviteButtonDisabled : null]}
                        onPress={() => handleAcceptInvitePress(invite.inviteCode)}
                        disabled={actionLoading}
                      >
                        <Text style={styles.pendingInviteAcceptText}>
                          {actionLoading ? 'Working...' : 'Accept'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.pendingInviteRejectButton, actionLoading ? styles.pendingInviteButtonDisabled : null]}
                        onPress={() => handleRejectInvitePress(invite.inviteCode)}
                        disabled={actionLoading}
                      >
                        <Text style={styles.pendingInviteRejectText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {inviteActionError ? <Text style={styles.errorText}>{inviteActionError}</Text> : null}

        <View style={styles.currentTripsSection}>
          <View style={styles.currentTripsHeaderRow}>
            <Text style={styles.currentTripsTitle}>CURRENT TRIPS</Text>
            <Text style={styles.currentTripsCount}>{currentTrips.length}</Text>
          </View>

          {currentTrips.length === 0 ? (
            <Text style={styles.emptyTripsText}>No trips yet. Create your first one above.</Text>
          ) : (
            <View style={styles.currentTripsGrid}>
              {currentTrips.slice(0, 6).map((trip) => (
                <View key={trip.id} style={styles.tripCard}>
                  <View style={styles.tripCardTopRow}>
                    <Text style={styles.tripCardTitle} numberOfLines={1}>
                      {trip.title}
                    </Text>
                    <View style={[styles.tripStatusPill, trip.status === 'active' ? styles.tripStatusActive : styles.tripStatusArchived]}>
                      <Text style={styles.tripStatusText}>{trip.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.tripCardMeta} numberOfLines={1}>{trip.groupName}</Text>
                  <Text style={styles.tripCardMeta}>{trip.origin} · {formatDateRange(normalizeDate(trip.departureDate), normalizeDate(trip.returnDate))}</Text>
                  <Text style={styles.tripCardMeta}>Travelers: {trip.travelers}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  circleTopLeft: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: '#EDE7D0',
    left: -140,
    top: -120,
  },
  circleBottomRight: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: '#D7E2F2',
    right: -120,
    bottom: -140,
  },
  topBar: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 18,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 28,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#C6CED8',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  signOutText: {
    color: '#31425B',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  planeRow: {
    width: '100%',
    maxWidth: 900,
    alignItems: 'flex-end',
    marginBottom: -8,
  },
  planeIcon: {
    fontSize: 56,
    color: '#1A1A2E',
    transform: [{ rotate: '-45deg' }],
  },
  planeIconMobile: {
    fontSize: 44,
  },
  title: {
    fontSize: 68,
    fontWeight: '900',
    color: '#111D3B',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 72,
  },
  titleCompact: {
    fontSize: 52,
    lineHeight: 56,
  },
  titleMobile: {
    fontSize: 34,
    lineHeight: 40,
  },
  titleUnderline: {
    width: 740,
    maxWidth: '90%',
    height: 5,
    backgroundColor: '#F59E0B',
    marginTop: 8,
    borderRadius: 6,
  },
  subtitle: {
    marginTop: 18,
    color: '#8194B0',
    fontSize: 34,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  subtitleCompact: {
    fontSize: 22,
  },
  fieldsRow: {
    marginTop: 42,
    width: '100%',
    maxWidth: 1120,
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  fieldCard: {
    width: 340,
    minHeight: 116,
    borderWidth: 2,
    borderColor: '#CDD5E1',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F4F6F9',
  },
  completedCard: {
    borderColor: '#6EE7A5',
    backgroundColor: '#EDF9F1',
  },
  travelersCard: {
    borderColor: '#CBD5E1',
  },
  travelersCardActive: {
    borderColor: '#3B5BDB',
    backgroundColor: '#EEF2FF',
  },
  fieldLabel: {
    color: '#2E3A53',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  fieldInput: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: '700',
    color: '#111827',
    paddingVertical: 0,
  },
  fieldInputMobile: {
    fontSize: 24,
  },
  dateInputRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  webDateContainer: {
    flex: 1,
  },
  nativeDateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D4DBE6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  dateDash: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '700',
  },
  travelersContent: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  inviteToggleText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  invitePanel: {
    width: '100%',
    maxWidth: 660,
    marginTop: 18,
    borderWidth: 2,
    borderColor: '#C5CFDF',
    borderRadius: 16,
    backgroundColor: '#F8FAFD',
    padding: 20,
    gap: 12,
  },
  inviteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inviteLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#556987',
  },
  inviteCount: {
    fontSize: 14,
    color: '#7B8BA4',
    fontWeight: '600',
  },
  inviteInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  inviteInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
  },
  sendButton: {
    backgroundColor: '#7BA7E8',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    minWidth: 92,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emailChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#C8D3E2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  emailChipText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  removeInviteText: {
    fontSize: 18,
    lineHeight: 18,
    color: '#64748B',
    fontWeight: '700',
  },
  errorText: {
    marginTop: 14,
    fontSize: 14,
    color: '#C53030',
    fontWeight: '600',
  },
  exploreButton: {
    marginTop: 26,
    width: 430,
    maxWidth: '90%',
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  exploreButtonMobile: {
    width: '100%',
  },
  exploreButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  pendingInvitesSection: {
    marginTop: 24,
    width: '100%',
    maxWidth: 1120,
    borderWidth: 1,
    borderColor: '#D4DBE6',
    borderRadius: 16,
    backgroundColor: '#FFF8EE',
    padding: 16,
  },
  pendingInvitesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingInvitesTitle: {
    color: '#7A3E00',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pendingInvitesCount: {
    color: '#8B5E34',
    fontSize: 14,
    fontWeight: '700',
  },
  pendingInvitesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pendingInviteCard: {
    flexGrow: 1,
    flexBasis: 280,
    borderWidth: 1,
    borderColor: '#F0D7B6',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 4,
  },
  pendingInviteInviter: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingInviteGroup: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  pendingInviteMeta: {
    color: '#42546D',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingInviteExpiry: {
    marginTop: 3,
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  pendingInviteActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  pendingInviteAcceptButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    alignItems: 'center',
  },
  pendingInviteRejectButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    paddingVertical: 10,
    alignItems: 'center',
  },
  pendingInviteAcceptText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pendingInviteRejectText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  pendingInviteButtonDisabled: {
    opacity: 0.6,
  },
  currentTripsSection: {
    marginTop: 28,
    width: '100%',
    maxWidth: 1120,
    borderWidth: 1,
    borderColor: '#D4DBE6',
    borderRadius: 16,
    backgroundColor: '#F8FBFF',
    padding: 16,
    marginBottom: 18,
  },
  currentTripsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentTripsTitle: {
    color: '#274060',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  currentTripsCount: {
    color: '#5F6F86',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyTripsText: {
    color: '#6B7B92',
    fontSize: 14,
    fontWeight: '500',
  },
  currentTripsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tripCard: {
    flexGrow: 1,
    flexBasis: 280,
    borderWidth: 1,
    borderColor: '#CFD8E5',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 4,
  },
  tripCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  tripCardTitle: {
    flex: 1,
    color: '#12223D',
    fontSize: 16,
    fontWeight: '800',
  },
  tripStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tripStatusActive: {
    backgroundColor: '#E7F9EF',
  },
  tripStatusArchived: {
    backgroundColor: '#EEF2F7',
  },
  tripStatusText: {
    color: '#2F3A4D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tripCardMeta: {
    color: '#4C5D76',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default CreateTripScreen;
