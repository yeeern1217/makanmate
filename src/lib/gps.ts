import { GPSPosition } from "@/types/ai";
import { useAppStore } from "@/store/useAppStore";

export function getCurrentPosition(): Promise<GPSPosition> {
  const simulated = useAppStore.getState().simulatedPosition;
  if (simulated) {
    return Promise.resolve(simulated);
  }
  if (process.env.NEXT_PUBLIC_MOCK_GPS === "true") {
    return Promise.resolve({
      lat: parseFloat(process.env.NEXT_PUBLIC_MOCK_GPS_LAT ?? "3.1390"),
      lng: parseFloat(process.env.NEXT_PUBLIC_MOCK_GPS_LNG ?? "101.6869"),
      accuracy: 10,
    });
  }
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      reject,
      { enableHighAccuracy: true, timeout: 10000 }
    )
  );
}
