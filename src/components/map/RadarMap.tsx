"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { HeritageNode } from "@/types/heritage";
import { GPSPosition } from "@/types/ai";
import { computeAkarScore } from "@/lib/scoring/akar-score";

const CARTO_POSITRON = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

function createGrassrootsPin(node: HeritageNode, isDiscovered: boolean, isTarget: boolean): HTMLDivElement {
  const score = computeAkarScore(node);
  const el = document.createElement("div");
  el.style.cssText = "position: relative; cursor: pointer; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;";

  const ring = document.createElement("div");
  ring.style.cssText = `
    width: 36px; height: 36px; border-radius: 50%;
    background: ${isDiscovered ? "#d4a947" : "#4a7c59"};
    border: ${isTarget ? "4px solid #c4553a" : `3px solid ${isDiscovered ? "#c4a882" : "#2c1810"}`};
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 ${isTarget ? "18px #c4553aaa" : isDiscovered ? "14px #d4a94788" : "10px #4a7c5966"};
    transition: all 0.3s;
  `;
  const label = document.createElement("span");
  label.textContent = String(score);
  label.title = `Akar Score: ${score}`;
  label.style.cssText = "font-size: 11px; font-weight: 800; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5); line-height: 1;";
  ring.appendChild(label);
  el.appendChild(ring);

  if (isTarget) {
    const pulse = document.createElement("div");
    pulse.style.cssText = "position: absolute; top: -7px; left: -7px; width: 50px; height: 50px; border-radius: 50%; background: #c4553a33; animation: gps-pulse 2s infinite; pointer-events: none;";
    el.appendChild(pulse);
  }
  return el;
}

function createHypedPin(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "width: 14px; height: 14px; border-radius: 50%; background: #9e9e9e; opacity: 0.45; border: 2px solid #bbb; cursor: default;";
  return el;
}

function createUserPin(): HTMLDivElement {
  const userEl = document.createElement("div");
  userEl.style.cssText = "width: 16px; height: 16px; border-radius: 50%; background: #4285f4; border: 3px solid white; box-shadow: 0 0 10px #4285f4; position: relative;";
  const pulseEl = document.createElement("div");
  pulseEl.style.cssText = "position: absolute; top: -8px; left: -8px; width: 32px; height: 32px; border-radius: 50%; background: #4285f433; animation: gps-pulse 2s infinite;";
  userEl.appendChild(pulseEl);
  return userEl;
}

export default function RadarMap({ nodes, discoveredNodes, userPosition, targetNodeId, onNodeClick, initialCenter, initialZoom }: {
  nodes: HeritageNode[];
  discoveredNodes: string[];
  userPosition: GPSPosition | null;
  targetNodeId?: string | null;
  onNodeClick: (node: HeritageNode) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const nodeMarkersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_POSITRON,
      center: initialCenter ?? [101.6869, 3.139],
      zoom: initialZoom ?? 12,
    });
    mapRef.current = map;
    const resize = () => map.resize();
    const raf = requestAnimationFrame(resize);
    const ro = new ResizeObserver(resize);
    ro.observe(containerRef.current);
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      map.remove();
      mapRef.current = null;
    };
    // The starting viewport is intentionally used only at mount. Later GPS or
    // simulator positions are handled by the reactive synchronisation below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sync = () => {
      nodeMarkersRef.current.forEach((marker) => marker.remove());
      nodeMarkersRef.current = nodes.map((node) => {
        const el = node.isGrassroots
          ? createGrassrootsPin(node, discoveredNodes.includes(node.id), node.id === targetNodeId)
          : createHypedPin();
        if (node.isGrassroots) el.addEventListener("click", () => onNodeClick(node));
        return new maplibregl.Marker({ element: el }).setLngLat([node.lng, node.lat]).addTo(map);
      });
      userMarkerRef.current?.remove();
      userMarkerRef.current = userPosition
        ? new maplibregl.Marker({ element: createUserPin() }).setLngLat([userPosition.lng, userPosition.lat]).addTo(map)
        : null;
      if (userPosition) map.flyTo({ center: [userPosition.lng, userPosition.lat], zoom: Math.max(map.getZoom(), 14), duration: 700 });
    };
    if (map.isStyleLoaded()) sync();
    else map.once("load", sync);
  }, [nodes, discoveredNodes, userPosition, targetNodeId, onNodeClick]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
