"use client";

import { useEffect, useRef } from "react";
import Map, { type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { globeViewToMapLibre } from "@/lib/mapLibreBasemap";

type ViewState = { lat: number; lng: number; altitude: number };

type MapLibreBasemapProps = {
  mapStyle: string;
  viewState: ViewState;
  className?: string;
};

export function MapLibreBasemap({ mapStyle, viewState, className }: MapLibreBasemapProps) {
  const mapRef = useRef<MapRef>(null);
  const projectionReadyRef = useRef(false);
  const camera = globeViewToMapLibre(viewState);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !projectionReadyRef.current) return;

    map.jumpTo({
      center: [camera.longitude, camera.latitude],
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
    });
  }, [camera.bearing, camera.latitude, camera.longitude, camera.pitch, camera.zoom]);

  return (
    <div className={className} style={{ pointerEvents: "none" }}>
      <Map
        ref={mapRef}
        mapStyle={mapStyle}
        initialViewState={{
          longitude: camera.longitude,
          latitude: camera.latitude,
          zoom: camera.zoom,
          pitch: camera.pitch,
          bearing: camera.bearing,
        }}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        interactive={false}
        renderWorldCopies={false}
        onLoad={(event) => {
          const map = event.target;
          map.setProjection({ type: "globe" });
          projectionReadyRef.current = true;
          map.jumpTo({
            center: [camera.longitude, camera.latitude],
            zoom: camera.zoom,
            pitch: camera.pitch,
            bearing: camera.bearing,
          });
        }}
      />
    </div>
  );
}
