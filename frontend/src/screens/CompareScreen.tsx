/**
 * CompareScreen Component
 * Full-page comparison view for voting on destinations
 * Matches the mockup with flight/hotel selection modals
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CompareDestination } from '../types';
import { searchFlights, searchHotels, FlightOption, HotelOption } from '../services/api';

// ============================================
// TYPES
// ============================================

interface UserPreferenceBar {
  userId: string;
  initial: string;
  color: string;
  value: number; // 0-10
}

interface DestinationWithSelections extends CompareDestination {
  selectedFlight?: FlightOption;
  selectedHotel?: HotelOption;
  userBars?: UserPreferenceBar[];
}

interface VoteMember {
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}

interface DestinationVote {
  destinationId: string;
  userId: string;
  vote: -1 | 1;
}

interface VoterProfile {
  userId: string;
  label: string;
  initial: string;
  color: string;
}

interface CompareScreenProps {
  destinations: CompareDestination[];
  tripDetails: {
    origin: string;
    departureDate: string;
    returnDate: string;
    travelers: number;
  };
  users?: Array<{ id: string; initial: string; color: string; preferences?: Record<string, number> }>;
  voteMembers?: VoteMember[];
  votes?: DestinationVote[];
  currentUserId?: string;
  onBack: () => void;
<<<<<<< stage-navigation
  onVote: (destinationIds: string[]) => void;
  locked?: boolean;
  votedDestinationIds?: string[];
=======
  onVote: (destinationId: string, removeVote?: boolean) => void;
}

const VOTER_COLORS = ['#4A90D9', '#5C6AC4', '#2D9CDB', '#27AE60', '#E67E22', '#EB5757'];

function initialFromLabel(label: string): string {
  const normalized = (label || '').trim();
  return normalized ? normalized.charAt(0).toUpperCase() : 'U';
}

function colorFromUserId(userId: string): string {
  const hash = userId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return VOTER_COLORS[hash % VOTER_COLORS.length];
>>>>>>> main
}

// ============================================
// FLIGHT SELECTION MODAL
// ============================================

interface FlightModalProps {
  visible: boolean;
  destination: DestinationWithSelections | null;
  origin: string;
  departureDate: string;
  returnDate?: string;
  travelers: number;
  onSelect: (flight: FlightOption) => void;
  onClose: () => void;
}

const FlightModal: React.FC<FlightModalProps> = ({
  visible,
  destination,
  origin,
  departureDate,
  returnDate,
  travelers,
  onSelect,
  onClose,
}) => {
  const [flights, setFlights] = useState<FlightOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && destination) {
      setLoading(true);
      setError(null);
      searchFlights(origin, destination.city, departureDate, returnDate, travelers)
        .then((result) => {
          setFlights(result.flights);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load flights');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [visible, destination, origin, departureDate, returnDate, travelers]);

  if (!destination) return null;

  const formatTime = (time?: string) => time || '--:--';
  const formatStops = (stops?: number) => {
    if (stops === undefined || stops === 0) return 'Nonstop';
    return `${stops} stop${stops > 1 ? 's' : ''}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Flights · {origin} → {destination.city.substring(0, 3).toUpperCase()} · {departureDate.split('-').slice(1).join('/')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#4A90D9" />
              <Text style={styles.loadingText}>Searching flights...</Text>
            </View>
          ) : error ? (
            <View style={styles.modalError}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalList}>
              {flights.map((flight, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.flightItem}
                  onPress={() => {
                    onSelect(flight);
                    onClose();
                  }}
                >
                  <View style={styles.flightInfo}>
                    <Text style={styles.flightAirline}>{flight.airline}</Text>
                    <Text style={styles.flightDetails}>
                      {formatTime(flight.departureTime)} → {formatTime(flight.returnTime)} · {formatStops(flight.stops)}
                    </Text>
                  </View>
                  <Text style={styles.flightPrice}>${flight.price}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ============================================
// HOTEL SELECTION MODAL
// ============================================

interface HotelModalProps {
  visible: boolean;
  destination: DestinationWithSelections | null;
  checkInDate: string;
  checkOutDate: string;
  travelers: number;
  onSelect: (hotel: HotelOption) => void;
  onClose: () => void;
}

const HotelModal: React.FC<HotelModalProps> = ({
  visible,
  destination,
  checkInDate,
  checkOutDate,
  travelers,
  onSelect,
  onClose,
}) => {
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && destination) {
      setLoading(true);
      setError(null);
      searchHotels(destination.city, checkInDate, checkOutDate, travelers)
        .then((result) => {
          setHotels(result.hotels);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load hotels');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [visible, destination, checkInDate, checkOutDate, travelers]);

  if (!destination) return null;

  const formatRating = (rating: number) => `★ ${rating.toFixed(1)}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Hotels · {destination.city} · {checkInDate.split('-').slice(1).join('/')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#4A90D9" />
              <Text style={styles.loadingText}>Searching hotels...</Text>
            </View>
          ) : error ? (
            <View style={styles.modalError}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalList}>
              {hotels.map((hotel, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.hotelItem}
                  onPress={() => {
                    onSelect(hotel);
                    onClose();
                  }}
                >
                  <View style={styles.hotelInfo}>
                    <Text style={styles.hotelName}>{hotel.name}</Text>
                    <Text style={styles.hotelDetails}>
                      {formatRating(hotel.rating)} · {hotel.amenities?.join(', ') || 'Standard amenities'}
                    </Text>
                  </View>
                  <Text style={styles.hotelPrice}>${hotel.nightlyRate}/night</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ============================================
// PREFERENCE BARS COMPONENT
// ============================================

interface PreferenceBarsProps {
  bars: UserPreferenceBar[];
}

const PreferenceBars: React.FC<PreferenceBarsProps> = ({ bars }) => {
  return (
    <View style={styles.preferenceBars}>
      {bars.map((bar) => (
        <View key={bar.userId} style={styles.preferenceBarRow}>
          <View style={[styles.preferenceBarDot, { backgroundColor: bar.color }]}>
            <Text style={styles.preferenceBarInitial}>{bar.initial}</Text>
          </View>
          <View style={styles.preferenceBarTrack}>
            <View
              style={[
                styles.preferenceBarFill,
                { width: `${(bar.value / 10) * 100}%`, backgroundColor: bar.color },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

// ============================================
// DESTINATION CARD COMPONENT
// ============================================

interface DestinationCardProps {
  destination: DestinationWithSelections;
  voterProfiles: VoterProfile[];
  hasCurrentUserVoted: boolean;
  tripDetails: {
    origin: string;
    departureDate: string;
    returnDate: string;
    travelers: number;
  };
  onViewFlights: () => void;
  onViewHotels: () => void;
  onVote: () => void;
  locked?: boolean;
  isVoted?: boolean;
}

const DestinationCard: React.FC<DestinationCardProps> = ({
  destination,
  voterProfiles,
  hasCurrentUserVoted,
  tripDetails,
  onViewFlights,
  onViewHotels,
  onVote,
  locked = false,
  isVoted = false,
}) => {
  // Calculate nights
  const calculateNights = () => {
    const start = new Date(tripDetails.departureDate);
    const end = new Date(tripDetails.returnDate);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const nights = calculateNights();

  // Calculate total price based on selections
  const calculateTotalPrice = () => {
    let flightTotal = 0;
    let hotelTotal = 0;
    
    if (destination.selectedFlight) {
      flightTotal = destination.selectedFlight.price * tripDetails.travelers;
    }
    if (destination.selectedHotel) {
      hotelTotal = destination.selectedHotel.nightlyRate * nights;
    }
    return { flightTotal, hotelTotal, total: flightTotal + hotelTotal };
  };

  const hasSelections = destination.selectedFlight || destination.selectedHotel;
  const prices = calculateTotalPrice();

  return (
    <View style={styles.card}>
      {/* Category Label */}
      <Text style={styles.cardBestFor}>BEST FOR</Text>
      <Text style={styles.cardCategory}>{destination.category}</Text>

      {/* City Name */}
      <Text style={styles.cardCity}>{destination.city}, {destination.state}</Text>

      {/* Price */}
      <Text style={styles.cardPrice}>
        {hasSelections ? `$${prices.total.toLocaleString()}` : destination.priceRange}
      </Text>
      <Text style={styles.cardPriceLabel}>
        {hasSelections ? `${tripDetails.travelers} traveler${tripDetails.travelers > 1 ? 's' : ''} · ${nights} night${nights > 1 ? 's' : ''}` : 'per person · estimated'}
      </Text>

      {/* User Preference Bars */}
      {destination.userBars && destination.userBars.length > 0 && (
        <PreferenceBars bars={destination.userBars} />
      )}

      {/* Flight Section */}
      <View style={styles.travelSection}>
        <View style={styles.travelRow}>
          <Text style={styles.travelLabel}>FLIGHT</Text>
          <TouchableOpacity 
            style={[styles.viewButton, destination.selectedFlight && styles.viewButtonSelected]} 
            onPress={onViewFlights}
          >
            <Text style={[styles.viewButtonText, destination.selectedFlight && styles.viewButtonTextSelected]}>
              {destination.selectedFlight ? 'CHANGE' : 'VIEW'}
            </Text>
          </TouchableOpacity>
        </View>
        {destination.selectedFlight ? (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedAirline}>{destination.selectedFlight.airline}</Text>
            <Text style={styles.selectedDetails}>
              {destination.selectedFlight.departureTime || '--:--'} · {destination.selectedFlight.stops === 0 ? 'Nonstop' : `${destination.selectedFlight.stops} stop${(destination.selectedFlight.stops || 0) > 1 ? 's' : ''}`}
            </Text>
            <Text style={styles.selectedPrice}>${destination.selectedFlight.price} × {tripDetails.travelers} = ${prices.flightTotal}</Text>
          </View>
        ) : (
          <Text style={styles.noSelectionText}>No flight selected</Text>
        )}
      </View>

      {/* Hotel Section */}
      <View style={styles.travelSection}>
        <View style={styles.travelRow}>
          <Text style={styles.travelLabel}>HOTEL</Text>
          <TouchableOpacity 
            style={[styles.viewButton, destination.selectedHotel && styles.viewButtonSelected]} 
            onPress={onViewHotels}
          >
            <Text style={[styles.viewButtonText, destination.selectedHotel && styles.viewButtonTextSelected]}>
              {destination.selectedHotel ? 'CHANGE' : 'VIEW'}
            </Text>
          </TouchableOpacity>
        </View>
        {destination.selectedHotel ? (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedAirline}>{destination.selectedHotel.name}</Text>
            <Text style={styles.selectedDetails}>
              ★ {destination.selectedHotel.rating.toFixed(1)} · {destination.selectedHotel.amenities?.slice(0, 2).join(', ') || 'Standard'}
            </Text>
            <Text style={styles.selectedPrice}>${destination.selectedHotel.nightlyRate}/night × {nights} = ${prices.hotelTotal}</Text>
          </View>
        ) : (
          <Text style={styles.noSelectionText}>No hotel selected</Text>
        )}
      </View>

      {/* Vote Button */}
<<<<<<< stage-navigation
      <TouchableOpacity
        style={[styles.voteButton, locked && !isVoted && styles.voteButtonLocked, isVoted && styles.voteButtonVoted]}
        onPress={onVote}
        disabled={locked}
      >
        <Text style={styles.voteButtonText}>
          {locked
            ? isVoted ? 'YOUR VOTE ✓' : 'VOTING CLOSED'
            : isVoted ? 'SELECTED ✓' : 'CLICK TO VOTE'}
=======
      <View style={styles.votersSection}>
        <Text style={styles.votersLabel}>
          {voterProfiles.length === 0
            ? 'No votes yet'
            : `${voterProfiles.length} vote${voterProfiles.length > 1 ? 's' : ''}`}
        </Text>
        {voterProfiles.length > 0 && (
          <View style={styles.votersRow}>
            {voterProfiles.map((profile) => (
              <View key={profile.userId} style={styles.voterChip}>
                <View style={[styles.voterAvatar, { backgroundColor: profile.color }]}>
                  <Text style={styles.voterAvatarText}>{profile.initial}</Text>
                </View>
                <Text style={styles.voterName} numberOfLines={1}>
                  {profile.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.voteButton, hasCurrentUserVoted && styles.removeVoteButton]}
        onPress={onVote}
      >
        <Text style={[styles.voteButtonText, hasCurrentUserVoted && styles.removeVoteButtonText]}>
          {hasCurrentUserVoted ? 'REMOVE VOTE' : 'VOTE'}
>>>>>>> main
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ============================================
// MAIN COMPARE SCREEN
// ============================================

export const CompareScreen: React.FC<CompareScreenProps> = ({
  destinations,
  tripDetails,
  users = [],
  voteMembers = [],
  votes = [],
  currentUserId,
  onBack,
  onVote,
  locked = false,
  votedDestinationIds = [],
}) => {
  // Track selections for each destination
  const [destinationsWithSelections, setDestinationsWithSelections] = useState<DestinationWithSelections[]>(() => {
    return destinations.map((dest) => ({
      ...dest,
      userBars: users.map((user) => ({
        userId: user.id,
        initial: user.initial,
        color: user.color,
        value: user.preferences?.overall || 5 + Math.random() * 4,
      })),
    }));
  });

  // Selected destination ids before locking
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [flightModalVisible, setFlightModalVisible] = useState(false);
  const [hotelModalVisible, setHotelModalVisible] = useState(false);
  const [activeDestination, setActiveDestination] = useState<DestinationWithSelections | null>(null);

  const voteMemberById = useMemo(
    () => new Map(voteMembers.map((member) => [member.userId, member])),
    [voteMembers]
  );

  const positiveVotesByDestination = useMemo(() => {
    const byDestination = new Map<string, DestinationVote[]>();
    votes
      .filter((entry) => entry.vote === 1)
      .forEach((entry) => {
        const current = byDestination.get(entry.destinationId) || [];
        current.push(entry);
        byDestination.set(entry.destinationId, current);
      });
    return byDestination;
  }, [votes]);

  const getVoterProfilesForDestination = useCallback(
    (destinationId: string): VoterProfile[] => {
      const entries = positiveVotesByDestination.get(destinationId) || [];
      const uniqueUserIds = [...new Set(entries.map((entry) => entry.userId))];
      return uniqueUserIds.map((userId) => {
        const member = voteMemberById.get(userId);
        const label = member?.displayName || member?.handle || 'User';
        return {
          userId,
          label,
          initial: initialFromLabel(label),
          color: colorFromUserId(userId),
        };
      });
    },
    [positiveVotesByDestination, voteMemberById]
  );

  // Only update if destinations array actually changes (new destinations added)
  useEffect(() => {
    setDestinationsWithSelections((prev) => {
      // Check if we have new destinations
      const prevIds = new Set(prev.map((d) => d.id));
      const newDests = destinations.filter((d) => !prevIds.has(d.id));

      if (newDests.length === 0 && prev.length === destinations.length) {
        // No change needed - keep existing selections
        return prev;
      }

      // Merge: keep existing selections, add new destinations
      const existingById = new Map(prev.map((d) => [d.id, d]));
      return destinations.map((dest) => {
        const existing = existingById.get(dest.id);
        if (existing) {
          // Keep existing selection state
          return existing;
        }
        // New destination
        return {
          ...dest,
          userBars: users.map((user) => ({
            userId: user.id,
            initial: user.initial,
            color: user.color,
            value: user.preferences?.overall || 5 + Math.random() * 4,
          })),
        };
      });
    });
  }, [destinations, users]);

  // Toggle a destination's vote selection
  const handleToggleVote = useCallback((destinationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(destinationId)) {
        next.delete(destinationId);
      } else {
        next.add(destinationId);
      }
      return next;
    });
  }, []);

  // Handle flight selection
  const handleFlightSelect = useCallback((destinationId: string, flight: FlightOption) => {
    console.log('Flight selected:', destinationId, flight);
    setDestinationsWithSelections((prev) =>
      prev.map((d) =>
        d.id === destinationId ? { ...d, selectedFlight: flight } : d
      )
    );
  }, []);

  // Handle hotel selection
  const handleHotelSelect = useCallback((destinationId: string, hotel: HotelOption) => {
    console.log('Hotel selected:', destinationId, hotel);
    setDestinationsWithSelections((prev) =>
      prev.map((d) =>
        d.id === destinationId ? { ...d, selectedHotel: hotel } : d
      )
    );
  }, []);

  // Open flight modal
  const openFlightModal = useCallback((destination: DestinationWithSelections) => {
    setActiveDestination(destination);
    setFlightModalVisible(true);
  }, []);

  // Open hotel modal
  const openHotelModal = useCallback((destination: DestinationWithSelections) => {
    setActiveDestination(destination);
    setHotelModalVisible(true);
  }, []);

  const canDone = !locked && selectedIds.size > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        // disable back button when locked
        <TouchableOpacity onPress={onBack} style={styles.backButton} disabled={locked}>
          <Text style={[styles.backText, locked && styles.backTextDisabled]}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {locked ? 'VOTING CLOSED' : 'VOTE FOR YOUR DESTINATION!'}
        </Text>
        {canDone ? (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => onVote(Array.from(selectedIds))}
          >
            <Text style={styles.doneButtonText}>DONE ({selectedIds.size})</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Cards Container */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsContainer}
      >
<<<<<<< stage-navigation
        {destinationsWithSelections.map((destination) => (
          <DestinationCard
            key={destination.id}
            destination={destination}
            tripDetails={tripDetails}
            onViewFlights={() => openFlightModal(destination)}
            onViewHotels={() => openHotelModal(destination)}
            onVote={() => handleToggleVote(destination.id)}
            locked={locked}
            isVoted={locked ? votedDestinationIds.includes(destination.id) : selectedIds.has(destination.id)}
          />
        ))}
=======
        {destinationsWithSelections.map((destination) => {
          const voterProfiles = getVoterProfilesForDestination(destination.id);
          const hasCurrentUserVoted = Boolean(
            currentUserId && voterProfiles.some((profile) => profile.userId === currentUserId)
          );

          return (
            <DestinationCard
              key={destination.id}
              destination={destination}
              voterProfiles={voterProfiles}
              hasCurrentUserVoted={hasCurrentUserVoted}
              tripDetails={tripDetails}
              onViewFlights={() => openFlightModal(destination)}
              onViewHotels={() => openHotelModal(destination)}
              onVote={() => onVote(destination.id, hasCurrentUserVoted)}
            />
          );
        })}
>>>>>>> main
      </ScrollView>

      {/* Flight Modal */}
      <FlightModal
        visible={flightModalVisible}
        destination={activeDestination}
        origin={tripDetails.origin}
        departureDate={tripDetails.departureDate}
        returnDate={tripDetails.returnDate}
        travelers={tripDetails.travelers}
        onSelect={(flight) => {
          if (activeDestination) {
            handleFlightSelect(activeDestination.id, flight);
          }
        }}
        onClose={() => setFlightModalVisible(false)}
      />

      {/* Hotel Modal */}
      <HotelModal
        visible={hotelModalVisible}
        destination={activeDestination}
        checkInDate={tripDetails.departureDate}
        checkOutDate={tripDetails.returnDate}
        travelers={tripDetails.travelers}
        onSelect={(hotel) => {
          if (activeDestination) {
            handleHotelSelect(activeDestination.id, hotel);
          }
        }}
        onClose={() => setHotelModalVisible(false)}
      />
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  backTextDisabled: {
    color: '#CCC',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 60,
  },
  doneButton: {
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardsContainer: {
    padding: 24,
    paddingBottom: 40,
    gap: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: 320,
    marginRight: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardBestFor: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardCity: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 16,
  },
  cardPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4A90D9',
    textAlign: 'center',
  },
  cardPriceLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  preferenceBars: {
    marginBottom: 20,
  },
  preferenceBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  preferenceBarDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  preferenceBarInitial: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  preferenceBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  preferenceBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  travelSection: {
    marginBottom: 16,
  },
  travelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  travelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  viewButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4A90D9',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  viewButtonSelected: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A90D9',
  },
  viewButtonTextSelected: {
    color: '#FFFFFF',
  },
  selectedContainer: {
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#28A745',
  },
  selectedAirline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  selectedDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  selectedPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#28A745',
  },
  noSelectionText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  selectedText: {
    fontSize: 12,
    color: '#28A745',
    marginTop: 6,
    fontWeight: '500',
  },
  voteButton: {
    backgroundColor: '#F5C842',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
<<<<<<< stage-navigation
  voteButtonLocked: {
    backgroundColor: '#CBD5E1',
  },
  voteButtonVoted: {
    backgroundColor: '#16A34A',
=======
  removeVoteButton: {
    backgroundColor: '#FFE9EC',
    borderWidth: 1,
    borderColor: '#E03D56',
>>>>>>> main
  },
  voteButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: 0.5,
  },
  removeVoteButtonText: {
    color: '#A01E31',
  },
  votersSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  votersLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5F6B7A',
    marginBottom: 8,
  },
  votersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  voterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F5FA',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    maxWidth: 140,
  },
  voterAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  voterAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
  voterName: {
    fontSize: 12,
    color: '#1A1A2E',
    fontWeight: '600',
    flexShrink: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4A5568',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalClose: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  modalError: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#DC3545',
  },
  modalList: {
    maxHeight: 400,
  },
  flightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  flightInfo: {
    flex: 1,
  },
  flightAirline: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  flightDetails: {
    fontSize: 13,
    color: '#666',
  },
  flightPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  hotelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  hotelInfo: {
    flex: 1,
  },
  hotelName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  hotelDetails: {
    fontSize: 13,
    color: '#666',
  },
  hotelPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
});

export default CompareScreen;
