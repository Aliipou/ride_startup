export type RiderStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type DutyStatus = 'OFFLINE' | 'ONLINE' | 'ON_RIDE';
export type BikeType = 'STANDARD' | 'ELECTRIC';
export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type RidePhase = 'TO_PICKUP' | 'TO_DROPOFF';

export interface Rider {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: RiderStatus;
  bikeType: BikeType;
  rating: number;
  totalRides: number;
  profilePhotoUrl?: string;
  documents: RiderDocument[];
  createdAt: string;
}

export interface RiderDocument {
  type: 'ID_FRONT' | 'ID_BACK' | 'PROFILE_PHOTO' | 'BIKE_PHOTO';
  status: DocumentStatus;
  url?: string;
  uploadedAt?: string;
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface RideRequest {
  id: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  pickupAddress: string;
  dropoffAddress: string;
  distance: number; // km
  price: number; // EUR
  surgeMultiplier?: number;
  bikeType: BikeType;
  customer: {
    id: string;
    name: string;
    rating: number;
    maskedPhone: string;
  };
  expiresAt: string;
}

export interface ActiveRide {
  id: string;
  phase: RidePhase;
  pickupLocation: Location;
  dropoffLocation: Location;
  pickupAddress: string;
  dropoffAddress: string;
  distance: number;
  price: number;
  customer: {
    id: string;
    name: string;
    rating: number;
    maskedPhone: string;
  };
  startedAt?: string;
  arrivedAt?: string;
}

export interface Earnings {
  today: number;
  available: number;
  pending: number;
}

export interface Transaction {
  id: string;
  type: 'RIDE_COMPLETION' | 'TIP' | 'BONUS';
  amount: number;
  rideId?: string;
  description: string;
  createdAt: string;
  status: 'COMPLETED' | 'PENDING';
}

export interface WeeklyEarnings {
  day: string;
  amount: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  bikeType: BikeType;
}

export interface CancelReason {
  code: string;
  label: string;
}

export const CANCEL_REASONS: CancelReason[] = [
  { code: 'CUSTOMER_NOT_AT_PICKUP', label: 'Customer not at pickup location' },
  { code: 'SAFETY_CONCERN', label: 'Safety concern' },
  { code: 'MECHANICAL_ISSUE', label: 'Bike mechanical issue' },
  { code: 'WRONG_LOCATION', label: 'Wrong pickup location' },
  { code: 'OTHER', label: 'Other reason' },
];
