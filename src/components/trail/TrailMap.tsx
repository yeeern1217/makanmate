"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { TrailStop } from "@/lib/trails/trail-builder";

const ORIGIN_COLORS: Record<string, string> = {
  Malay: "#4a7c59",
  Chinese: "#c4553a",
  Indian: "#d4a947",
  Peranakan: "#6b5ce7",
  Mamak: "#e67e22",
  Portuguese: "#3498db",
};

export default function TrailMap({ stops }: { stops: TrailStop[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || stops.length === 0) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const bounds = new maplibregl.LngLatBounds();
    stops.forEach((s) => bounds.extend([s.lng, s.lat]));

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      bounds,
      fitBoundsOptions: { padding: 60 },
    });

    mapRef.current = map;

    // Fix "half map": MapLibre reads the container size once at init. With the
    // dynamic import inside a scroll container (and on device/orientation
    // changes), that size can be stale, so the canvas fills only part of the
    // box. Re-run resize after layout settles and whenever the box changes.
    const resize = () => map.resize();
    const raf = requestAnimationFrame(resize);
    const ro = new ResizeObserver(resize);
    ro.observe(containerRef.current);
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);

    map.on("load", () => {
      map.resize();
      // Route line
      if (stops.length >= 2) {
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: stops.map((s) => [s.lng, s.lat]),
            },
          },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          paint: {
            "line-color": "#d4a947",
            "line-width": 3,
            "line-dasharray": [2, 2],
            "line-opacity": 0.7,
          },
        });
      }

      // Markers
      stops.forEach((stop, i) => {
        const color = ORIGIN_COLORS[stop.culturalOrigin] ?? "#c4553a";
        const el = document.createElement("div");
        el.style.cssText = `
          width: 32px; height: 32px; border-radius: 50%;
          background: ${color}; color: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700;
          border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        `;
        el.textContent = String(i + 1);

        const popup = new maplibregl.Popup({ offset: 20, closeButton: false })
          .setHTML(`
            <div style="font-family: sans-serif; padding: 4px;">
              <strong style="font-size: 13px;">${stop.stallName}</strong>
              <br/><span style="font-size: 11px; color: #8b7355;">${stop.dishName}</span>
              <br/><span style="font-size: 10px; color: ${color}; font-weight: 600;">${stop.culturalOrigin}</span>
              <span style="font-size: 10px; color: #8b7355; margin-left: 6px;">${stop.communityCatchCount} catches</span>
            </div>
          `);

        new maplibregl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(popup)
          .addTo(map);
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      map.remove();
      mapRef.current = null;
    };
  }, [stops]);

  return <div ref={containerRef} className="h-full w-full" />;
}
