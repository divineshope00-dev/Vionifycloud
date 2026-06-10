import { useState, useEffect } from 'react';
import { VideoQuality } from '../services/supabaseService';

export function useAdaptiveQuality() {
  const [quality, setQuality] = useState<VideoQuality>('720p');

  useEffect(() => {
    // Check if the Network Information API is supported
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    const updateQuality = () => {
      if (connection) {
        // If downlink is less than 2 Mbps, switch to 480p
        // downlink: returns the effective bandwidth estimate in megabits per second
        if (connection.downlink < 2) {
          setQuality('480p');
        } else {
          setQuality('720p');
        }
      }
    };

    // Initial check
    updateQuality();

    // Listen for changes
    if (connection) {
      connection.addEventListener('change', updateQuality);
      return () => connection.removeEventListener('change', updateQuality);
    }
  }, []);

  return quality;
}
