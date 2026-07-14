"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { HeritageNode } from "@/types/heritage";
import { GPSPosition } from "@/types/ai";
import { computeAkarScore } from "@/lib/scoring/akar-score";

const CARTO_POSITRON =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

function createGrassrootsPin(node: HeritageNode, isDiscovered: boolean): HTMLDivElement {
  const score = computeAkarScore(node);
  const el = document.createElement("div");
  el.style.cssText = `
    position: relative; cursor: pointer;
    width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
  `;

  const ring = document.createElement("div");
  ring.style.cssText = `
    width: 36px; height: 36px; border-radius: 50%;
    background: ${isDiscovered ? "#d4a947" : "#4a7c59"};
    border: 3px solid ${isDiscovered ? "#c4a882" : "#2c1810"};
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 ${isDiscovered ? "14px #d4a94788" : "10px #4a7c5966"};
    transition: all 0.3s;
  `;

  const label = document.createElement("span");
  label.textContent = String(score);
  label.style.cssText = `
    font-size: 11px; font-weight: 800; color: #fff;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    line-height: 1;
  `;

  ring.appendChild(label);
  el.appendChild(ring);

  const pulse = document.createElement("div");
  pulse.style.cssText = `
    position: absolute; top: -4px; left: -4px;
    width: 44px; height: 44px; border-radius: 50%;
    background: ${isDiscovered ? "#d4a94733" : "#4a7c5933"};
    animation: gps-pulse 2.5s infinite;
    pointer-events: none;
  `;
  el.appendChild(pulse);

  return el;
}

function createHypedPin(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width: 14px; height: 14px; border-radius: 50%;
    background: #9e9e9e; opacity: 0.45;
    border: 2px solid #bbb;
    cursor: default;
  `;
  return el;
}

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
      style: CARTO_POSITRON,
      center,
      zoom: 12,
    });

    mapRef.current = map;

    map.on("load", () => {
      nodes.forEach((node) => {
        if (!node.isGrassroots) {
          const el = createHypedPin();
          new maplibregl.Marker({ element: el })
            .setLngLat([node.lng, node.lat])
            .addTo(map);
          return;
        }

        const isDiscovered = discoveredNodes.includes(node.id);
        const el = createGrassrootsPin(node, isDiscovered);
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
          position: relative;
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
