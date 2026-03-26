import React, { createContext, useContext } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

const GoogleMapsContext = createContext({
  isLoaded: false,
  loadError: undefined,
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

const LIBRARIES = ['places'];
const LOADER_ID = 'gmap';

function getMapsApiKey() {
  return (
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ''
  );
}

export function GoogleMapsProvider({ children }) {
  const apiKey = getMapsApiKey();

  const loaderConfig = apiKey
    ? { id: LOADER_ID, googleMapsApiKey: apiKey, libraries: LIBRARIES }
    : { id: LOADER_ID, libraries: LIBRARIES };

  const { isLoaded, loadError } = useJsApiLoader(loaderConfig);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}
