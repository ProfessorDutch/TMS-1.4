import { useState, useEffect } from 'react';
import { loadGoogleMapsScript } from '../config/google-maps';

interface PlaceDetails {
  formatted_address?: string;
  place_id?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMaps = async () => {
      if (!isLoaded && !isLoading) {
        setIsLoading(true);
        try {
          await loadGoogleMapsScript();
          setIsLoaded(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load Google Maps');
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadMaps();
  }, []);

  const getPlaceDetails = async (placeId: string): Promise<PlaceDetails | null> => {
    if (!isLoaded) {
      setError('Google Maps API not loaded');
      return null;
    }

    try {
      const service = new google.maps.places.PlacesService(
        document.createElement('div')
      );

      return new Promise((resolve, reject) => {
        service.getDetails(
          {
            placeId,
            fields: ['formatted_address', 'place_id', 'geometry']
          },
          (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
              resolve({
                formatted_address: place.formatted_address,
                place_id: place.place_id,
                geometry: place.geometry ? {
                  location: {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                  }
                } : undefined
              });
            } else {
              reject(new Error(`Failed to fetch place details: ${status}`));
            }
          }
        );
      });
    } catch (err) {
      console.error('Place details error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch place details');
      return null;
    }
  };

  const geocodeAddress = async (address: string): Promise<google.maps.LatLngLiteral | null> => {
    if (!isLoaded) {
      setError('Google Maps API not loaded');
      return null;
    }

    try {
      const geocoder = new google.maps.Geocoder();
      const response = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });

      if (response[0]?.geometry?.location) {
        return {
          lat: response[0].geometry.location.lat(),
          lng: response[0].geometry.location.lng()
        };
      }

      throw new Error('No location found');
    } catch (err) {
      console.error('Geocoding error:', err);
      setError(err instanceof Error ? err.message : 'Failed to geocode address');
      return null;
    }
  };

  return {
    isLoaded,
    isLoading,
    error,
    getPlaceDetails,
    geocodeAddress
  };
}