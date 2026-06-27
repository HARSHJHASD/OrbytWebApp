import React, { useState, useEffect, createContext, useContext } from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import Button from './ui/Button';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Location } from '../types';

interface LocationContextType {
  location: Location | null;
}

export const LocationContext = createContext<LocationContextType>({ location: null });
export const useUserLocation = () => useContext(LocationContext);

interface LocationGuardProps {
  children: React.ReactNode;
}

const LocationGuard: React.FC<LocationGuardProps> = ({ children }) => {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  const updateLocation = async () => {
    if (!navigator.geolocation) return;

    return new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          let lat = position.coords.latitude;
          let lng = position.coords.longitude;

          // The Decoy: apply ~300m fuzzing if enabled on profile
          if (user) {
            try {
              const profile = await api.profile.get(user.uid);
              if (profile?.isFuzzed) {
                // 300m in degrees ≈ 0.0027
                lat += (Math.random() - 0.5) * 2 * 0.0027;
                lng += (Math.random() - 0.5) * 2 * (0.0027 / Math.cos(lat * Math.PI / 180));
              }
            } catch (e) {
              // silently ignore — don't block location update
            }
          }

          const loc = { lat, lng };
          setCurrentLocation(loc);
          setHasPermission(true);
          setLoading(false);

          if (user) {
            try {
              await api.profile.createOrUpdate(user.uid, {
                lastLocation: loc
              });
            } catch (e) {
              console.error("Failed to sync location to profile", e);
            }
          }
          resolve();
        },
        (error) => {
          console.error("Location error:", error);
          setLoading(false);
          reject(error);
        },
        { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
      );
    });
  };

  useEffect(() => {
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        updateLocation();
      } else {
        setLoading(false);
      }
    });
  }, [user]);

  const requestLocation = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }
    updateLocation().catch(() => {
      alert("Location access is required to use Orbyt. Please enable it in your browser settings.");
      setLoading(false);
    });
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="animate-pulse flex flex-col items-center">
          <MapPin className="w-10 h-10 text-slate-700 mb-2" />
          <p className="text-slate-500 font-medium">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col p-6 items-center justify-center text-center">
        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-8 animate-fade-in border border-slate-800">
          <MapPin className="w-12 h-12 text-primary-500" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Enable Location</h1>
        <p className="text-slate-400 mb-8 max-w-xs leading-relaxed text-sm">
          Orbyt collects your location data to enable finding nearby people, local meetups, and displaying distance to others.
        </p>

        <Button onClick={requestLocation} fullWidth className="shadow-xl shadow-primary-500/20">
          Allow Location Access
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        <p className="mt-6 text-xs text-slate-500">
          Location is only collected while the app is in use. See our Privacy Policy for more details.
        </p>
      </div>
    );
  }

  return (
    <LocationContext.Provider value={{ location: currentLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export default LocationGuard;