import { HeritageNode } from "@/types/heritage";

// A catch should mean the explorer is physically at the stall, not merely in
// the same city. The simulator can still place a developer at a node exactly.
// Set wide (2km) for demo purposes so a fixed/mock position triggers catches.
export const HERITAGE_CATCH_RADIUS_M = 2000;

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestHeritageNode(
  nodes: HeritageNode[],
  lat: number,
  lng: number
): { node: HeritageNode; distanceMeters: number } | null {
  let nearest: HeritageNode | null = null;
  let minDist = Infinity;
  for (const node of nodes) {
    const dist = haversineDistance(lat, lng, node.lat, node.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = node;
    }
  }
  return nearest ? { node: nearest, distanceMeters: Math.round(minDist) } : null;
}
