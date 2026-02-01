"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getRankColor, formatCoordinates } from "@/lib/geo-utils";
import type { Competitor } from "@/lib/dataforseo";

interface GeoGridMapProps {
  center: {
    latitude: number;
    longitude: number;
  };
  results: Array<{
    id: string;
    grid_index: number;
    rank: number | null;
    latitude: number;
    longitude: number;
    competitors?: Competitor[];
  }>;
}

export function GeoGridMap({ center, results }: GeoGridMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Evita doppia inizializzazione
    if (mapRef.current) return;

    // Crea la mappa
    const map = L.map(mapContainerRef.current).setView(
      [center.latitude, center.longitude],
      14
    );

    // Aggiungi tile layer (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Marker per il centro (location del cliente) - Icona blu speciale
    const centerIcon = L.divIcon({
      className: "custom-center-marker",
      html: `
        <div style="
          background-color: #3b82f6;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">
          📍
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker([center.latitude, center.longitude], { icon: centerIcon })
      .addTo(map)
      .bindPopup(`
        <div style="text-align: center;">
          <strong>🏢 Location Cliente</strong><br/>
          <span style="font-size: 11px; color: #666;">
            ${formatCoordinates(center.latitude, center.longitude)}
          </span>
        </div>
      `);

    // Marker circolari per ogni risultato della griglia
    results.forEach((result) => {
      const color = getRankColor(result.rank);
      const rankText = result.rank !== null ? result.rank : "?";

      // Crea un marker circolare colorato
      const circleMarker = L.circleMarker(
        [result.latitude, result.longitude],
        {
          radius: 10,
          fillColor: color,
          color: "#fff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }
      ).addTo(map);

      // Popup con informazioni dettagliate + competitor
      const competitorsHtml = result.competitors && result.competitors.length > 0
        ? `
          <div style="
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px solid #e5e7eb;
            text-align: left;
          ">
            <div style="font-size: 11px; font-weight: bold; color: #374151; margin-bottom: 6px;">
              🏆 Top 5 in questa zona:
            </div>
            <div style="font-size: 10px; color: #6b7280; line-height: 1.6;">
              ${result.competitors.slice(0, 5).map((comp) => `
                <div style="margin-bottom: 3px; display: flex; align-items: start;">
                  <span style="font-weight: 600; min-width: 20px; color: #9ca3af;">#${comp.rank}</span>
                  <span style="flex: 1;">${comp.name}${comp.rating ? ` <span style="color: #f59e0b;">★${comp.rating.toFixed(1)}</span>` : ''}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `
        : '';

      const popupContent = `
        <div style="text-align: center; min-width: 200px; max-width: 300px;">
          <div style="
            background-color: ${color};
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            margin-bottom: 8px;
          ">
            ${result.rank !== null ? `Rank #${result.rank}` : "Non trovato"}
          </div>
          <div style="font-size: 11px; color: #666; margin-bottom: 4px;">
            <strong>Punto:</strong> ${result.grid_index + 1}
          </div>
          <div style="font-size: 10px; color: #999;">
            ${formatCoordinates(result.latitude, result.longitude)}
          </div>
          ${competitorsHtml}
        </div>
      `;

      circleMarker.bindPopup(popupContent, { maxWidth: 320 });

      // Aggiungi numero del punto al centro del cerchio
      const labelIcon = L.divIcon({
        className: "custom-label",
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            color: white;
            font-weight: bold;
            font-size: 10px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          ">
            ${rankText}
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      L.marker([result.latitude, result.longitude], {
        icon: labelIcon,
        interactive: false,
      }).addTo(map);
    });

    // Calcola bounds e centra la mappa per mostrare tutti i punti
    if (results.length > 0) {
      const bounds = L.latLngBounds([
        ...results.map((r) => [r.latitude, r.longitude] as [number, number]),
        [center.latitude, center.longitude],
      ]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    mapRef.current = map;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, results]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-96 rounded-lg border overflow-hidden"
      style={{ zIndex: 0 }}
    />
  );
}
