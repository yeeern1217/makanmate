"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { HeritageNode } from "@/types/heritage";
import { GPSPosition } from "@/types/ai";

const CARTO_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export default function RadarMap({
  nodes,
  discoveredNodes,
  userPosition,
  onNodeClick,
}: {
  nodes: HeritageNode[];
  discoveredNodes: string[];
  userPosition: GPSPosition | null;
  onNodeClick: (node: HeritageNode) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = userPosition
      ? [userPosition.lng, userPosition.lat]
      : [101.6869, 3.139];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_DARK,
      center,
      zoom: 12,
    });

    mapRef.current = map;

    map.on("load", () => {
      nodes.forEach((node) => {
        const isDiscovered = discoveredNodes.includes(node.id);

        const el = document.createElement("div");
        el.className = "heritage-pin";
        el.style.cssText = `
          width: 20px; height: 20px; border-radius: 50%; cursor: pointer;
          background: ${isDiscovered ? "#ffd700" : "#39ff14"};
          opacity: ${isDiscovered ? 1 : 0.5};
          box-shadow: 0 0 ${isDiscovered ? "15px #ffd700" : "8px #39ff1466"};
          transition: all 0.3s;
        `;

        el.addEventListener("click", () => onNodeClick(node));

        new maplibregl.Marker({ element: el })
          .setLngLat([node.lng, node.lat])
          .addTo(map);
      });

      if (userPosition) {
        const userEl = document.createElement("div");
        userEl.style.cssText = `
          width: 16px; height: 16px; border-radius: 50%;
          background: #4285f4; border: 3px solid white;
          box-shadow: 0 0 10px #4285f4;
        `;

        const pulseEl = document.createElement("div");
        pulseEl.style.cssText = `
          position: absolute; top: -8px; left: -8px;
          width: 32px; height: 32px; border-radius: 50%;
          background: #4285f433; animation: gps-pulse 2s infinite;
        `;
        userEl.appendChild(pulseEl);

        new maplibregl.Marker({ element: userEl })
          .setLngLat([userPosition.lng, userPosition.lat])
          .addTo(map);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
