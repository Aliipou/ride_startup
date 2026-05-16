'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Flag, Phone, Star, X, ChevronDown, Navigation } from 'lucide-react';
import { ActiveRide, CANCEL_REASONS } from '@/lib/types';
import { riderApi } from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface RideNavigationProps {
  ride: ActiveRide;
  onArrivedAtPickup: () => void;
  onCompleteRide: () => void;
  onCancelRide: (reason: string) => void;
}

export default function RideNavigation({
  ride,
  onArrivedAtPickup,
  onCompleteRide,
  onCancelRide,
}: RideNavigationProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const isPickupPhase = ride.phase === 'TO_PICKUP';
  const destination = isPickupPhase ? ride.pickupLocation : ride.dropoffLocation;
  const destinationAddress = isPickupPhase ? ride.pickupAddress : ride.dropoffAddress;

  const initMap = useCallback(async () => {
    if (!mapContainerRef.current || mapRef.current) return;

    const mapboxgl = (await import('mapbox-gl')).default;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.warn('Mapbox token not configured');
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [destination.lng, destination.lat],
      zoom: 14,
    });

    map.on('load', () => {
      setMapLoaded(true);

      // Add destination marker
      const el = document.createElement('div');
      el.className = 'w-8 h-8 rounded-full flex items-center justify-center shadow-lg';
      el.style.backgroundColor = isPickupPhase ? '#1B9E77' : '#F59E0B';
      el.innerHTML = isPickupPhase
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>';

      new mapboxgl.Marker({ element: el })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map);

      // Fit map to show route
      map.flyTo({
        center: [destination.lng, destination.lat],
        zoom: 15,
        speed: 1.2,
      });
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );
  }, [destination.lat, destination.lng, isPickupPhase]);

  useEffect(() => {
    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initMap]);

  const handleArrivedAtPickup = async () => {
    setIsActionLoading(true);
    try {
      await riderApi.arrivedAtPickup(ride.id);
      onArrivedAtPickup();
      toast.success('Marked as arrived at pickup!');
    } catch {
      toast.error('Failed to update status. Try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    setIsActionLoading(true);
    try {
      await riderApi.completeRide(ride.id);
      onCompleteRide();
      toast.success('Ride completed!');
    } catch {
      toast.error('Failed to complete ride. Try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!selectedReason) {
      toast.error('Please select a cancellation reason');
      return;
    }
    setIsCancelling(true);
    try {
      await riderApi.cancelRide(ride.id, selectedReason);
      onCancelRide(selectedReason);
      toast.success('Ride cancelled');
    } catch {
      toast.error('Failed to cancel ride. Try again.');
      setIsCancelling(false);
    }
  };

  const openInMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=bicycling`;
    window.open(url, '_blank');
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-100">
      {/* Phase Indicator Banner */}
      <div
        className={clsx(
          'absolute top-0 left-0 right-0 z-10 px-4 pt-safe-top pb-3 text-white text-center text-sm font-bold',
          isPickupPhase ? 'bg-primary' : 'bg-accent'
        )}
      >
        {isPickupPhase ? (
          <span className="flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4" />
            Going to pickup — {ride.pickupAddress}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Flag className="w-4 h-4" />
            On ride — delivering to {ride.dropoffAddress}
          </span>
        )}
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-600 text-sm">Loading map...</p>
          </div>
        </div>
      )}

      {/* Open in Google Maps */}
      <button
        onClick={openInMaps}
        className="absolute top-14 left-4 z-10 bg-white shadow-lg rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-semibold text-dark"
      >
        <Navigation className="w-4 h-4 text-primary" />
        Navigate
      </button>

      {/* Customer Info Strip */}
      <div className="absolute bottom-36 left-4 right-4 z-10">
        <div className="bg-white rounded-2xl shadow-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-lg">
              {ride.customer.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-dark truncate">{ride.customer.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                <span className="text-sm text-gray-600 font-medium">
                  {ride.customer.rating.toFixed(1)}
                </span>
              </div>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-500">{ride.customer.maskedPhone}</span>
            </div>
          </div>
          <a
            href={`tel:${ride.customer.maskedPhone}`}
            className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0"
            aria-label="Call customer"
          >
            <Phone className="w-4 h-4 text-primary" />
          </a>
        </div>
      </div>

      {/* Action Button */}
      <div className="absolute bottom-6 left-4 right-4 z-10 space-y-3">
        {isPickupPhase ? (
          <button
            onClick={handleArrivedAtPickup}
            disabled={isActionLoading}
            className={clsx(
              'w-full py-5 rounded-2xl bg-primary text-white font-bold text-lg',
              'shadow-xl shadow-primary/40 transition-all duration-200',
              'active:scale-95 disabled:opacity-60',
              'flex items-center justify-center gap-2'
            )}
          >
            <MapPin className="w-5 h-5" />
            {isActionLoading ? 'Updating...' : 'Arrived at Pickup'}
          </button>
        ) : (
          <button
            onClick={handleCompleteRide}
            disabled={isActionLoading}
            className={clsx(
              'w-full py-5 rounded-2xl bg-accent text-white font-bold text-lg',
              'shadow-xl shadow-amber-400/40 transition-all duration-200',
              'active:scale-95 disabled:opacity-60',
              'flex items-center justify-center gap-2'
            )}
          >
            <Flag className="w-5 h-5" />
            {isActionLoading ? 'Completing...' : 'Complete Ride'}
          </button>
        )}

        {/* Cancel button */}
        <button
          onClick={() => setShowCancelModal(true)}
          className="w-full py-3 rounded-xl border border-gray-200 bg-white text-gray-500 font-semibold text-sm flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel Ride
        </button>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowCancelModal(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-dark font-bold text-lg">Cancel Ride</h3>
              <button onClick={() => setShowCancelModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <p className="text-gray-500 text-sm mb-4">
              Please select a reason for cancellation:
            </p>

            <div className="space-y-2 mb-6">
              {CANCEL_REASONS.map((reason) => (
                <button
                  key={reason.code}
                  onClick={() => setSelectedReason(reason.code)}
                  className={clsx(
                    'w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all',
                    'flex items-center gap-3 text-sm font-medium',
                    selectedReason === reason.code
                      ? 'border-primary bg-primary-50 text-primary-700'
                      : 'border-gray-100 text-gray-700 hover:border-gray-200'
                  )}
                >
                  <div
                    className={clsx(
                      'w-4 h-4 rounded-full border-2 flex-shrink-0',
                      selectedReason === reason.code
                        ? 'border-primary bg-primary'
                        : 'border-gray-300'
                    )}
                  />
                  {reason.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleCancelConfirm}
              disabled={!selectedReason || isCancelling}
              className={clsx(
                'w-full py-4 rounded-2xl font-bold text-base transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                selectedReason
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-100 text-gray-400'
              )}
            >
              {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
