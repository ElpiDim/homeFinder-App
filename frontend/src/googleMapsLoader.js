// src/googleMapsLoader.js
export const GOOGLE_LIBRARIES = ["places"];
export const GOOGLE_LOADER_ID = "google-map-script";

export const getMapsLoaderConfig = () => {
  const apiKey =
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    "";

  return {
    id: GOOGLE_LOADER_ID,
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_LIBRARIES,
    // κράτα ίδια παντού αν τα χρησιμοποιείς:
    language: "en",
    region: "US",
    version: "weekly",
  };
};
