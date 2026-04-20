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
  Dimensions,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { CompareDestination } from '../types';
import { searchFlights, searchHotels, FlightOption, HotelOption } from '../services/api';
import { WinnerInfo, MEMBER_COLOR_PALETTE } from './TripPlannerScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  selectedDepartureFlight?: FlightOption;
  selectedReturnFlight?: FlightOption;
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
  userColorMap?: Map<string, string>;
  onBack: () => void;
  onVote: (destinationId: string, removeVote?: boolean) => void;
  locked?: boolean;
  votedDestinationIds?: string[];
  winner?: WinnerInfo | null;
  doneUserIds?: Set<string>;
  onDoneVoting?: () => void;
  currentUserDone?: boolean;
}

function initialFromLabel(label: string): string {
  const normalized = (label || '').trim();
  return normalized ? normalized.charAt(0).toUpperCase() : 'U';
}

function colorFromUserId(userId: string): string {
  const hash = userId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return MEMBER_COLOR_PALETTE[hash % MEMBER_COLOR_PALETTE.length];
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
  flightDirection: 'departure' | 'return';
  onSelect: (flight: FlightOption, direction: 'departure' | 'return') => void;
  onClose: () => void;
}

const FlightModal: React.FC<FlightModalProps> = ({
  visible,
  destination,
  origin,
  departureDate,
  returnDate,
  travelers,
  flightDirection,
  onSelect,
  onClose,
}) => {
  const [flights, setFlights] = useState<FlightOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine search parameters based on flight direction
  const searchOrigin = flightDirection === 'departure' ? origin : destination?.city || '';
  const searchDestination = flightDirection === 'departure' ? destination?.city || '' : origin;
  const searchDate = flightDirection === 'departure' ? departureDate : returnDate || departureDate;

  useEffect(() => {
    if (visible && destination) {
      setLoading(true);
      setError(null);
      searchFlights(searchOrigin, searchDestination, searchDate, undefined, travelers)
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
  }, [visible, destination, searchOrigin, searchDestination, searchDate, travelers]);

  if (!destination) return null;

  const formatTime = (time?: string) => time || '--:--';
  const formatStops = (stops?: number) => {
    if (stops === undefined || stops === 0) return 'Nonstop';
    return `${stops} stop${stops > 1 ? 's' : ''}`;
  };

  const directionLabel = flightDirection === 'departure' ? 'Outbound' : 'Return';
  const routeLabel = flightDirection === 'departure' 
    ? `${origin} → ${destination.city.substring(0, 3).toUpperCase()}`
    : `${destination.city.substring(0, 3).toUpperCase()} → ${origin}`;
  const dateLabel = searchDate.split('-').slice(1).join('/');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {directionLabel} Flights · {routeLabel} · {dateLabel}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#4A90D9" />
              <Text style={styles.loadingText}>Searching {directionLabel.toLowerCase()} flights...</Text>
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
                    onSelect(flight, flightDirection);
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
  onViewDepartureFlight: () => void;
  onViewReturnFlight: () => void;
  onViewHotels: () => void;
  onVote: () => void;
  locked?: boolean;
  // isVoted?: boolean;
  currentUserDone?: boolean;
}

const DestinationCard: React.FC<DestinationCardProps> = ({
  destination,
  voterProfiles,
  hasCurrentUserVoted,
  tripDetails,
  onViewDepartureFlight,
  onViewReturnFlight,
  onViewHotels,
  onVote,
  locked = false,
  // isVoted = false,
  currentUserDone = false,
}) => {
  const voteDisabled = locked || currentUserDone;
  // Calculate nights
  const calculateNights = () => {
    const start = new Date(tripDetails.departureDate);
    const end = new Date(tripDetails.returnDate);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const nights = calculateNights();

  // Calculate total price based on selections
  const calculateTotalPrice = () => {
    let departureFlightTotal = 0;
    let returnFlightTotal = 0;
    let hotelTotal = 0;
    
    if (destination.selectedDepartureFlight) {
      departureFlightTotal = destination.selectedDepartureFlight.price * tripDetails.travelers;
    }
    if (destination.selectedReturnFlight) {
      returnFlightTotal = destination.selectedReturnFlight.price * tripDetails.travelers;
    }
    if (destination.selectedHotel) {
      hotelTotal = destination.selectedHotel.nightlyRate * nights;
    }
    return { 
      departureFlightTotal, 
      returnFlightTotal, 
      flightTotal: departureFlightTotal + returnFlightTotal,
      hotelTotal, 
      total: departureFlightTotal + returnFlightTotal + hotelTotal 
    };
  };

  const hasSelections = destination.selectedDepartureFlight || destination.selectedReturnFlight || destination.selectedHotel;
  const prices = calculateTotalPrice();

  return (
    <View style={styles.card}>
      {/* Scrollable content */}
      <ScrollView
        style={styles.cardScroll}
        contentContainerStyle={styles.cardScrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
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

        {/* Outbound Flight Section */}
        <View style={styles.travelSection}>
          <View style={styles.travelRow}>
            <Text style={styles.travelLabel}>OUTBOUND FLIGHT</Text>
            <TouchableOpacity
              style={[styles.viewButton, destination.selectedDepartureFlight && styles.viewButtonSelected]}
              onPress={onViewDepartureFlight}
            >
              <Text style={[styles.viewButtonText, destination.selectedDepartureFlight && styles.viewButtonTextSelected]}>
                {destination.selectedDepartureFlight ? 'CHANGE' : 'VIEW'}
              </Text>
            </TouchableOpacity>
          </View>
          {destination.selectedDepartureFlight ? (
            <View style={styles.selectedContainer}>
              <Text style={styles.selectedAirline}>{destination.selectedDepartureFlight.airline}</Text>
              <Text style={styles.selectedDetails}>
                {destination.selectedDepartureFlight.departureTime || '--:--'} · {destination.selectedDepartureFlight.stops === 0 ? 'Nonstop' : `${destination.selectedDepartureFlight.stops} stop${(destination.selectedDepartureFlight.stops || 0) > 1 ? 's' : ''}`}
              </Text>
              <Text style={styles.selectedPrice}>${destination.selectedDepartureFlight.price} × {tripDetails.travelers} = ${prices.departureFlightTotal}</Text>
            </View>
          ) : (
            <Text style={styles.noSelectionText}>No outbound flight selected</Text>
          )}
        </View>

        {/* Return Flight Section */}
        <View style={styles.travelSection}>
          <View style={styles.travelRow}>
            <Text style={styles.travelLabel}>RETURN FLIGHT</Text>
            <TouchableOpacity
              style={[styles.viewButton, destination.selectedReturnFlight && styles.viewButtonSelected]}
              onPress={onViewReturnFlight}
            >
              <Text style={[styles.viewButtonText, destination.selectedReturnFlight && styles.viewButtonTextSelected]}>
                {destination.selectedReturnFlight ? 'CHANGE' : 'VIEW'}
              </Text>
            </TouchableOpacity>
          </View>
          {destination.selectedReturnFlight ? (
            <View style={styles.selectedContainer}>
              <Text style={styles.selectedAirline}>{destination.selectedReturnFlight.airline}</Text>
              <Text style={styles.selectedDetails}>
                {destination.selectedReturnFlight.departureTime || '--:--'} · {destination.selectedReturnFlight.stops === 0 ? 'Nonstop' : `${destination.selectedReturnFlight.stops} stop${(destination.selectedReturnFlight.stops || 0) > 1 ? 's' : ''}`}
              </Text>
              <Text style={styles.selectedPrice}>${destination.selectedReturnFlight.price} × {tripDetails.travelers} = ${prices.returnFlightTotal}</Text>
            </View>
          ) : (
            <Text style={styles.noSelectionText}>No return flight selected</Text>
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

        {/* Voters */}
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
      </ScrollView>

      {/* Vote button — pinned at bottom of card */}
      <View style={styles.voteButtonWrapper}>
        <TouchableOpacity
          style={[
            styles.voteButton,
            hasCurrentUserVoted && !voteDisabled && styles.removeVoteButton,
            hasCurrentUserVoted && voteDisabled && styles.voteButtonVoted,
            !hasCurrentUserVoted && voteDisabled && styles.voteButtonLocked,
          ]}
          onPress={onVote}
          disabled={voteDisabled}
        >
          <Text style={[
            styles.voteButtonText,
            hasCurrentUserVoted && !voteDisabled && styles.removeVoteButtonText,
            voteDisabled && styles.voteButtonLockedText,
          ]}>
            {hasCurrentUserVoted ? 'REMOVE VOTE' : 'VOTE'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================
// WINNER REVEAL
// ============================================

interface WinnerRevealProps {
  winner: WinnerInfo;
  winnerDestination: DestinationWithSelections | undefined;
  votes: DestinationVote[];
  // voteMembers: VoteMember[];
  // userColorMap?: Map<string, string>;
  tripDetails: {
    origin: string;
    departureDate: string;
    returnDate: string;
    travelers: number;
  };
  onViewDepartureFlight: () => void;
  onViewReturnFlight: () => void;
  onViewHotels: () => void;
}

const WinnerReveal: React.FC<WinnerRevealProps> = ({
  winner,
  winnerDestination,
  votes,
  // voteMembers,
  // userColorMap,
  tripDetails,
  onViewDepartureFlight,
  onViewReturnFlight,
  onViewHotels,
}) => {
  const winnerVoteCount = votes.filter(
    (v) => v.destinationId === winner.destinationId && v.vote === 1
  ).length;

  const nights = useMemo(() => {
    const start = new Date(tripDetails.departureDate);
    const end = new Date(tripDetails.returnDate);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }, [tripDetails.departureDate, tripDetails.returnDate]);

  const prices = useMemo(() => {
    let departureFlightTotal = 0;
    let returnFlightTotal = 0;
    let hotelTotal = 0;
    if (winnerDestination?.selectedDepartureFlight) {
      departureFlightTotal = winnerDestination.selectedDepartureFlight.price * tripDetails.travelers;
    }
    if (winnerDestination?.selectedReturnFlight) {
      returnFlightTotal = winnerDestination.selectedReturnFlight.price * tripDetails.travelers;
    }
    if (winnerDestination?.selectedHotel) {
      hotelTotal = winnerDestination.selectedHotel.nightlyRate * nights;
    }
    return { departureFlightTotal, returnFlightTotal, hotelTotal };
  }, [winnerDestination, tripDetails.travelers, nights]);

  return (
    <View style={revealStyles.root}>
      {/* Confetti overlay — fires automatically on mount */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <ConfettiCannon
          count={160}
          origin={{ x: -10, y: 0 }}
          autoStart
          autoStartDelay={200}
          fadeOut
        />
        <ConfettiCannon
          count={160}
          origin={{ x: SCREEN_WIDTH + 10, y: 0 }}
          autoStart
          autoStartDelay={350}
          fadeOut
        />
      </View>

      <ScrollView
        contentContainerStyle={revealStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trophy + eyebrow */}
        <Text style={revealStyles.trophy}>🏆</Text>
        <Text style={revealStyles.eyebrow}>YOUR GROUP IS GOING TO</Text>

        {/* Hero card */}
        <View style={revealStyles.heroCard}>
          {winnerDestination?.category ? (
            <Text style={revealStyles.heroCategory}>
              {winnerDestination.category.toUpperCase()}
            </Text>
          ) : null}

          <Text style={revealStyles.heroCity}>{winner.city}</Text>
          <Text style={revealStyles.heroState}>{winner.state}</Text>

          <View style={revealStyles.heroDivider} />

          <Text style={revealStyles.heroPrice}>
            {winnerDestination?.priceRange ?? 'Price TBD'}
          </Text>

          <View style={revealStyles.heroVotePill}>
            <Text style={revealStyles.heroVotePillText}>
              {winnerVoteCount} {winnerVoteCount === 1 ? 'vote' : 'votes'}
            </Text>
          </View>
        </View>

        {/* Group summary */}
        <View style={revealStyles.groupSummary}>
          {winner.isTiebroken && (
            <View style={[revealStyles.tiebreakBadge, { marginBottom: 16 }]}>
              <Text style={revealStyles.tiebreakText}>
                ★  Best preference match for your group
              </Text>
            </View>
          )}

          {/* Preference bars */}
          {winnerDestination?.userBars && winnerDestination.userBars.length > 0 && (
            <View style={revealStyles.prefBarsSection}>
              <Text style={revealStyles.prefBarsLabel}>PREFERENCE MATCH</Text>
              {winnerDestination.userBars.map((bar) => (
                <View key={bar.userId} style={revealStyles.prefBarRow}>
                  <View style={[revealStyles.prefBarDot, { backgroundColor: bar.color }]}>
                    <Text style={revealStyles.prefBarInitial}>{bar.initial}</Text>
                  </View>
                  <View style={revealStyles.prefBarTrack}>
                    <View
                      style={[
                        revealStyles.prefBarFill,
                        { width: `${(bar.value / 10) * 100}%` as unknown as number, backgroundColor: bar.color },
                      ]}
                    />
                  </View>
                  <Text style={revealStyles.prefBarValue}>{Math.round(bar.value * 10)}%</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Travel sections */}
        <View style={revealStyles.travelCard}>
          {/* Outbound Flight */}
          <View style={revealStyles.travelSection}>
            <View style={revealStyles.travelRow}>
              <Text style={revealStyles.travelLabel}>OUTBOUND FLIGHT</Text>
              <TouchableOpacity
                style={[revealStyles.viewButton, winnerDestination?.selectedDepartureFlight && revealStyles.viewButtonSelected]}
                onPress={onViewDepartureFlight}
              >
                <Text style={[revealStyles.viewButtonText, winnerDestination?.selectedDepartureFlight && revealStyles.viewButtonTextSelected]}>
                  {winnerDestination?.selectedDepartureFlight ? 'CHANGE' : 'VIEW'}
                </Text>
              </TouchableOpacity>
            </View>
            {winnerDestination?.selectedDepartureFlight ? (
              <View style={revealStyles.selectedContainer}>
                <Text style={revealStyles.selectedAirline}>{winnerDestination.selectedDepartureFlight.airline}</Text>
                <Text style={revealStyles.selectedDetails}>
                  {winnerDestination.selectedDepartureFlight.departureTime || '--:--'} · {winnerDestination.selectedDepartureFlight.stops === 0 ? 'Nonstop' : `${winnerDestination.selectedDepartureFlight.stops} stop${(winnerDestination.selectedDepartureFlight.stops || 0) > 1 ? 's' : ''}`}
                </Text>
                <Text style={revealStyles.selectedPrice}>
                  ${winnerDestination.selectedDepartureFlight.price} × {tripDetails.travelers} = ${prices.departureFlightTotal}
                </Text>
              </View>
            ) : (
              <Text style={revealStyles.noSelectionText}>No outbound flight selected</Text>
            )}
          </View>

          <View style={revealStyles.travelDivider} />

          {/* Return Flight */}
          <View style={revealStyles.travelSection}>
            <View style={revealStyles.travelRow}>
              <Text style={revealStyles.travelLabel}>RETURN FLIGHT</Text>
              <TouchableOpacity
                style={[revealStyles.viewButton, winnerDestination?.selectedReturnFlight && revealStyles.viewButtonSelected]}
                onPress={onViewReturnFlight}
              >
                <Text style={[revealStyles.viewButtonText, winnerDestination?.selectedReturnFlight && revealStyles.viewButtonTextSelected]}>
                  {winnerDestination?.selectedReturnFlight ? 'CHANGE' : 'VIEW'}
                </Text>
              </TouchableOpacity>
            </View>
            {winnerDestination?.selectedReturnFlight ? (
              <View style={revealStyles.selectedContainer}>
                <Text style={revealStyles.selectedAirline}>{winnerDestination.selectedReturnFlight.airline}</Text>
                <Text style={revealStyles.selectedDetails}>
                  {winnerDestination.selectedReturnFlight.departureTime || '--:--'} · {winnerDestination.selectedReturnFlight.stops === 0 ? 'Nonstop' : `${winnerDestination.selectedReturnFlight.stops} stop${(winnerDestination.selectedReturnFlight.stops || 0) > 1 ? 's' : ''}`}
                </Text>
                <Text style={revealStyles.selectedPrice}>
                  ${winnerDestination.selectedReturnFlight.price} × {tripDetails.travelers} = ${prices.returnFlightTotal}
                </Text>
              </View>
            ) : (
              <Text style={revealStyles.noSelectionText}>No return flight selected</Text>
            )}
          </View>

          <View style={revealStyles.travelDivider} />

          {/* Hotel */}
          <View style={revealStyles.travelSection}>
            <View style={revealStyles.travelRow}>
              <Text style={revealStyles.travelLabel}>HOTEL</Text>
              <TouchableOpacity
                style={[revealStyles.viewButton, winnerDestination?.selectedHotel && revealStyles.viewButtonSelected]}
                onPress={onViewHotels}
              >
                <Text style={[revealStyles.viewButtonText, winnerDestination?.selectedHotel && revealStyles.viewButtonTextSelected]}>
                  {winnerDestination?.selectedHotel ? 'CHANGE' : 'VIEW'}
                </Text>
              </TouchableOpacity>
            </View>
            {winnerDestination?.selectedHotel ? (
              <View style={revealStyles.selectedContainer}>
                <Text style={revealStyles.selectedAirline}>{winnerDestination.selectedHotel.name}</Text>
                <Text style={revealStyles.selectedDetails}>
                  ★ {winnerDestination.selectedHotel.rating.toFixed(1)} · {winnerDestination.selectedHotel.amenities?.slice(0, 2).join(', ') || 'Standard'}
                </Text>
                <Text style={revealStyles.selectedPrice}>
                  ${winnerDestination.selectedHotel.nightlyRate}/night × {nights} = ${prices.hotelTotal}
                </Text>
              </View>
            ) : (
              <Text style={revealStyles.noSelectionText}>No hotel selected</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const revealStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  trophy: {
    fontSize: 72,
    marginBottom: 8,
    textAlign: 'center',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8899AA',
    letterSpacing: 2.5,
    marginBottom: 28,
    textAlign: 'center',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 36,
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    shadowColor: '#F5C842',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 28,
  },
  heroCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#AAAAAA',
    letterSpacing: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  heroCity: {
    fontSize: 52,
    fontWeight: '900',
    color: '#1A1A2E',
    textAlign: 'center',
    lineHeight: 58,
    letterSpacing: -1,
  },
  heroState: {
    fontSize: 22,
    fontWeight: '600',
    color: '#4A90D9',
    marginTop: 4,
    marginBottom: 22,
    textAlign: 'center',
  },
  heroDivider: {
    width: 56,
    height: 3,
    backgroundColor: '#F5C842',
    borderRadius: 2,
    marginBottom: 20,
  },
  heroPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 20,
    textAlign: 'center',
  },
  heroVotePill: {
    backgroundColor: '#F5C842',
    borderRadius: 99,
    paddingHorizontal: 22,
    paddingVertical: 9,
  },
  heroVotePillText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  groupSummary: {
    backgroundColor: '#242438',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    marginBottom: 16,
  },
  // groupTitle: {
  //   fontSize: 11,
  //   fontWeight: '700',
  //   color: '#6B7A99',
  //   letterSpacing: 2,
  //   marginBottom: 16,
  // },
  tiebreakBadge: {
    backgroundColor: '#1E3A6A',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 14,
  },
  tiebreakText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7AB3F5',
    textAlign: 'center',
  },
  // totalVotesText: {
  //   fontSize: 13,
  //   color: '#6B7A99',
  //   marginBottom: 16,
  // },
  prefBarsSection: {
    marginTop: 4,
  },
  prefBarsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4A5568',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  prefBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  prefBarDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  prefBarInitial: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  prefBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#353550',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  prefBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  prefBarValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8899AA',
    width: 36,
    textAlign: 'right',
  },
  travelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    marginBottom: 24,
  },
  travelSection: {
    marginBottom: 4,
    paddingVertical: 8,
  },
  travelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  travelLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: 0.5,
  },
  viewButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4A90D9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  viewButtonSelected: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A90D9',
  },
  viewButtonTextSelected: {
    color: '#FFFFFF',
  },
  selectedContainer: {
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#28A745',
  },
  selectedAirline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  selectedDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  selectedPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#28A745',
  },
  noSelectionText: {
    fontSize: 12,
    color: '#AAA',
    fontStyle: 'italic',
  },
  travelDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
});

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
  userColorMap,
  onBack,
  onVote,
  locked = false,
  votedDestinationIds = [],
  winner,
  doneUserIds = new Set(),
  onDoneVoting,
  currentUserDone = false,
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

  // Selected destination ids before locking (kept for reference — per-card voting now used instead)
  // const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [flightModalVisible, setFlightModalVisible] = useState(false);
  const [hotelModalVisible, setHotelModalVisible] = useState(false);
  const [activeDestination, setActiveDestination] = useState<DestinationWithSelections | null>(null);
  const [activeFlightDirection, setActiveFlightDirection] = useState<'departure' | 'return'>('departure');

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
          color: userColorMap?.get(userId) ?? colorFromUserId(userId),
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

  // Toggle a destination's vote selection (kept for reference — per-card voting now used instead)
  // const handleToggleVote = useCallback((destinationId: string) => {
  //   setSelectedIds((prev) => {
  //     const next = new Set(prev);
  //     if (next.has(destinationId)) {
  //       next.delete(destinationId);
  //     } else {
  //       next.add(destinationId);
  //     }
  //     return next;
  //   });
  // }, []);

  // Handle flight selection
  const handleFlightSelect = useCallback((destinationId: string, flight: FlightOption, direction: 'departure' | 'return') => {
    console.log('Flight selected:', destinationId, flight, direction);
    setDestinationsWithSelections((prev) =>
      prev.map((d) => {
        if (d.id !== destinationId) return d;
        if (direction === 'departure') {
          return { ...d, selectedDepartureFlight: flight };
        } else {
          return { ...d, selectedReturnFlight: flight };
        }
      })
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

  // Open flight modal for departure
  const openDepartureFlightModal = useCallback((destination: DestinationWithSelections) => {
    setActiveDestination(destination);
    setActiveFlightDirection('departure');
    setFlightModalVisible(true);
  }, []);

  // Open flight modal for return
  const openReturnFlightModal = useCallback((destination: DestinationWithSelections) => {
    setActiveDestination(destination);
    setActiveFlightDirection('return');
    setFlightModalVisible(true);
  }, []);

  // Open hotel modal
  const openHotelModal = useCallback((destination: DestinationWithSelections) => {
    setActiveDestination(destination);
    setHotelModalVisible(true);
  }, []);

  // const canDone = !locked && selectedIds.size > 0;

  // When all users are done voting, show the full-screen winner reveal
  const showReveal = locked && Boolean(winner);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, showReveal && styles.headerDark]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} disabled={locked || currentUserDone}>
          <Text style={[styles.backText, (locked || currentUserDone) && styles.backTextDisabled, showReveal && styles.backTextLight]}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, showReveal && styles.headerTitleLight]}>
          {showReveal ? 'DESTINATION CHOSEN!' : (locked || currentUserDone) ? 'VOTING CLOSED' : 'VOTE FOR YOUR DESTINATIONS!'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Full-screen winner reveal (replaces cards when voting closes) */}
      {showReveal ? (
        <WinnerReveal
          winner={winner!}
          winnerDestination={destinationsWithSelections.find((d) => d.id === winner!.destinationId)}
          votes={votes}
          voteMembers={voteMembers}
          userColorMap={userColorMap}
          tripDetails={tripDetails}
          onViewDepartureFlight={() => {
            const wd = destinationsWithSelections.find((d) => d.id === winner!.destinationId);
            if (wd) openDepartureFlightModal(wd);
          }}
          onViewReturnFlight={() => {
            const wd = destinationsWithSelections.find((d) => d.id === winner!.destinationId);
            if (wd) openReturnFlightModal(wd);
          }}
          onViewHotels={() => {
            const wd = destinationsWithSelections.find((d) => d.id === winner!.destinationId);
            if (wd) openHotelModal(wd);
          }}
        />
      ) : (
        <>
          {/* Cards Container */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.cardsScroll}
            contentContainerStyle={[styles.cardsContainer, { flexGrow: 1 }]}
          >
            {destinationsWithSelections.map((destination) => {
              const voterProfiles = getVoterProfilesForDestination(destination.id);
              const hasCurrentUserVoted = Boolean(
                currentUserId && voterProfiles.some((profile) => profile.userId === currentUserId)
              );
              // const isVoted = locked
              //   ? (votedDestinationIds || []).includes(destination.id)
              //   : hasCurrentUserVoted;

              return (
                <DestinationCard
                  key={destination.id}
                  destination={destination}
                  voterProfiles={voterProfiles}
                  hasCurrentUserVoted={hasCurrentUserVoted}
                  tripDetails={tripDetails}
                  onViewDepartureFlight={() => openDepartureFlightModal(destination)}
                  onViewReturnFlight={() => openReturnFlightModal(destination)}
                  onViewHotels={() => openHotelModal(destination)}
                  onVote={() => onVote(destination.id, hasCurrentUserVoted)}
                  locked={locked}
                  // isVoted={isVoted}
                  currentUserDone={currentUserDone}
                />
              );
            })}
          </ScrollView>

          {/* Done Voting Footer */}
          {!locked && (
            <View style={styles.doneFooter}>
              {/* Member done-status chips */}
              {voteMembers.length > 0 && (
                <View style={styles.doneStatusRow}>
                  {voteMembers.map((member) => {
                    const isDone = doneUserIds.has(member.userId);
                    const label = member.displayName || member.handle || 'User';
                    const initial = label.trim().charAt(0).toUpperCase();
                    const color = userColorMap?.get(member.userId) ?? colorFromUserId(member.userId);
                    return (
                      <View key={member.userId} style={[styles.doneChip, isDone && styles.doneChipDone]}>
                        <View style={[styles.doneChipAvatar, { backgroundColor: color }]}>
                          <Text style={styles.doneChipInitial}>{initial}</Text>
                        </View>
                        <Text style={[styles.doneChipLabel, isDone && styles.doneChipLabelDone]} numberOfLines={1}>
                          {isDone ? 'Done' : 'Voting…'}
                        </Text>
                        {isDone && <Text style={styles.doneCheck}>✓</Text>}
                      </View>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                style={[styles.doneButton, currentUserDone && styles.doneButtonDone]}
                onPress={onDoneVoting}
                disabled={currentUserDone}
              >
                <Text style={[styles.doneButtonText, currentUserDone && styles.doneButtonTextDone]}>
                  {currentUserDone ? 'WAITING FOR OTHERS…' : 'DONE VOTING'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Flight + Hotel modals — always present so selections are preserved */}
      <FlightModal
        visible={flightModalVisible}
        destination={activeDestination}
        origin={tripDetails.origin}
        departureDate={tripDetails.departureDate}
        returnDate={tripDetails.returnDate}
        travelers={tripDetails.travelers}
        flightDirection={activeFlightDirection}
        onSelect={(flight, direction) => {
          if (activeDestination) {
            handleFlightSelect(activeDestination.id, flight, direction);
          }
        }}
        onClose={() => setFlightModalVisible(false)}
      />
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
  headerDark: {
    backgroundColor: '#1A1A2E',
    borderBottomColor: '#2D2D44',
  },
  headerTitleLight: {
    color: '#F5C842',
  },
  backTextLight: {
    color: '#8899AA',
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
  // winnerBanner: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   backgroundColor: '#FFF8E7',
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#F5C842',
  //   paddingHorizontal: 24,
  //   paddingVertical: 14,
  //   gap: 14,
  // },
  // winnerBadge: {
  //   width: 44,
  //   height: 44,
  //   borderRadius: 22,
  //   backgroundColor: '#F5C842',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  // winnerBadgeText: {
  //   fontSize: 22,
  //   color: '#1A1A2E',
  // },
  // winnerText: {
  //   flex: 1,
  // },
  // winnerLabel: {
  //   fontSize: 11,
  //   fontWeight: '700',
  //   color: '#B07B00',
  //   letterSpacing: 1,
  //   marginBottom: 2,
  // },
  // winnerCity: {
  //   fontSize: 20,
  //   fontWeight: '800',
  //   color: '#1A1A2E',
  // },
  // winnerTiebreak: {
  //   fontSize: 12,
  //   color: '#666',
  //   marginTop: 2,
  // },
  cardsScroll: {
    flex: 1,
  },
  cardsContainer: {
    padding: 24,
    paddingBottom: 24,
    gap: 24,
    // stretch children to fill the ScrollView's height (cross axis)
    alignItems: 'stretch',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: 320,
    // no flex here — flex in a horizontal ScrollView applies to the horizontal axis
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardScroll: {
    flex: 1, // fills card height above the pinned vote button
  },
  cardScrollContent: {
    padding: 24,
    paddingBottom: 8,
    flexGrow: 1,
  },
  voteButtonWrapper: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
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
  // selectedText: {
  //   fontSize: 12,
  //   color: '#28A745',
  //   marginTop: 6,
  //   fontWeight: '500',
  // },
  voteButton: {
    backgroundColor: '#F5C842',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  voteButtonLocked: {
    backgroundColor: '#CBD5E1',
  },
  voteButtonVoted: {
    backgroundColor: '#16A34A',
  },
  removeVoteButton: {
    backgroundColor: '#FFE9EC',
    borderWidth: 1,
    borderColor: '#E03D56',
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
  // Done voting footer
  doneFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  doneStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  doneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F5FA',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  doneChipDone: {
    backgroundColor: '#EDFBF0',
    borderColor: '#27AE60',
  },
  doneChipAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneChipInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
  doneChipLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  doneChipLabelDone: {
    color: '#1A7A40',
    fontWeight: '600',
  },
  doneCheck: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '700',
  },
  doneButton: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonDone: {
    backgroundColor: '#CBD5E1',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  doneButtonTextDone: {
    color: '#7A8899',
  },
  voteButtonLockedText: {
    color: '#7A8899',
  },
});

export default CompareScreen;
