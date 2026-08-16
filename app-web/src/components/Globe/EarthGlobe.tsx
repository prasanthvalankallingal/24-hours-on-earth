"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type {
  CountryTimeUse,
  WorkingHoursBroad,
  CountryMetrics,
  City,
  Metric,
  Gender,
} from "@/lib/types";
import { METRIC_BY_KEY } from "@/lib/types";
import { rampColor, OCEAN, NO_DATA, CITY_GLOW } from "@/lib/colors";

// Graceful loading state shown while the client-only globe module downloads.
function GlobeFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-fg-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        <span className="text-xs tracking-wide">Loading the world…</span>
      </div>
    </div>
  );
}

export type GlobeMode = "realistic" | "data";

interface Props {
  timeuse: CountryTimeUse[];
  working: WorkingHoursBroad[];
  metrics: CountryMetrics[];
  cities: City[];
  metric: Metric;
  gender: Gender;
  mode: GlobeMode;
  onSelect: (code: string | null) => void;
  selected: string | null;
  /** 0 = fully zoomed out, 1 = fully zoomed in. Drives panel fade/shrink. */
  onZoom?: (zoom01: number) => void;
}

// Self-hosted from /public — no slow CDN round-trip, bundled at deploy.
// Prefix with basePath so assets resolve under GitHub Pages' /<repo>/ subpath.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const GEOJSON_URL = `${BASE}/globe/countries-110m.json`;
// Day "blue marble" — green/tan land vs blue ocean, so countries are legible in
// Realistic mode (the night-lights texture rendered as an all-blue sphere).
const EARTH_TEX_URL = `${BASE}/globe/earth-blue-marble.jpg`;
// Cities always shown, but label only the biggest to avoid clutter.
const LABELLED_CITIES = 90;

export default function EarthGlobe(props: Props) {
  const {
    timeuse,
    working,
    metrics,
    cities,
    metric,
    gender,
    mode,
    onSelect,
    selected,
    onZoom,
  } = props;

  const globeRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [polygons, setPolygons] = useState<any[]>([]);
  const [size, setSize] = useState({ w: 800, h: 600 });

  // react-globe.gl is WebGL/DOM-only, so it can't render on the server. Rather
  // than a Suspense-based dynamic import (which could stay stuck on the loading
  // fallback until an unrelated re-render — the "click a filter to reveal the
  // globe" bug), load it imperatively here: useEffect always runs after the
  // client mount, and its setState guarantees a re-render the moment the module
  // resolves. `() => m.default` because setState treats a bare function as an
  // updater, and the export is itself a component function.
  const [Globe, setGlobe] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    import("react-globe.gl").then((m) => {
      if (alive) setGlobe(() => m.default);
    });
    return () => { alive = false; };
  }, []);

  const def = METRIC_BY_KEY[metric];

  const tuByCode = useMemo(() => new Map(timeuse.map((d) => [d.code, d])), [timeuse]);
  const whByCode = useMemo(() => new Map(working.map((d) => [d.code, d])), [working]);
  const mByCode = useMemo(() => new Map(metrics.map((d) => [d.code, d])), [metrics]);

  // Value for a country under the current metric/gender.
  const valueFor = useMemo(() => {
    return (code: string): number | null => {
      if (metric === "leisure") {
        const t = tuByCode.get(code);
        if (!t) return null;
        return gender === "women" ? t.leisureWomenMin : gender === "men" ? t.leisureMenMin : t.leisureMin;
      }
      if (metric === "work") {
        const t = tuByCode.get(code);
        if (t?.workMin != null) return t.workMin;
        return whByCode.get(code)?.workMin ?? null;
      }
      const m = mByCode.get(code);
      const v = m?.[metric];
      return typeof v === "number" ? v : null;
    };
  }, [metric, gender, tuByCode, whByCode, mByCode]);

  const domain = useMemo(() => {
    const vals: number[] = [];
    const codes = new Set<string>([
      ...tuByCode.keys(),
      ...whByCode.keys(),
      ...mByCode.keys(),
    ]);
    for (const c of codes) {
      const v = valueFor(c);
      if (v != null) vals.push(v);
    }
    return vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : { min: 0, max: 1 };
  }, [valueFor, tuByCode, whByCode, mByCode]);

  // Load country polygons (client only).
  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ feature }, topo] = await Promise.all([
        import("topojson-client"),
        fetch(GEOJSON_URL).then((r) => r.json()),
      ]);
      if (!alive) return;
      const fc: any = feature(topo, topo.objects.countries);
      setPolygons(fc.features);
    })();
    return () => { alive = false; };
  }, []);

  // Responsive sizing.
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((e) => {
      const r = e[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);


  // Controls: drag to rotate, scroll/pinch to zoom (within Earth-focused limits).
  // Runs on mount (ref may be null → no-op) and re-applies on later prop changes;
  // onGlobeReady also calls it the instant the globe instance exists.
  const configureControls = useCallback(() => {
    const controls = globeRef.current?.controls?.();
    if (!controls) return;
    controls.autoRotate = !selected;
    controls.autoRotateSpeed = 0.35;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 180; // don't clip into the surface
    controls.maxDistance = 500; // stay Earth-focused
  }, [selected]);

  useEffect(() => {
    configureControls();
  }, [configureControls, polygons]);

  const nameToCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of metrics) m.set(d.country, d.code);
    for (const d of timeuse) m.set(d.country, d.code);
    for (const d of working) if (!m.has(d.country)) m.set(d.country, d.code);
    return m;
  }, [timeuse, working, metrics]);

  const codeOf = (f: any): string | null => nameToCode.get(f?.properties?.name) ?? null;

  const capColor = (f: any) => {
    const code = codeOf(f);
    if (code && code === selected) return "#ffffff";
    if (mode === "realistic") return "rgba(0,0,0,0)"; // let the satellite texture show
    if (!code) return NO_DATA;
    const v = valueFor(code);
    if (v == null) return NO_DATA;
    const t = (v - domain.min) / (domain.max - domain.min || 1);
    return rampColor(def.higherIsMore ? t : 1 - t);
  };

  // ONE stable globe material, created SYNCHRONOUSLY at first render (Three.js
  // materials are plain JS objects — no WebGL/DOM needed). Creating it via an
  // async import() left it null on first paint, which is the "needs a click to
  // load" bug. We mutate it per mode: realistic = satellite texture, data = ocean.
  const materialRef = useRef<THREE.MeshPhongMaterial | null>(null);
  if (!materialRef.current) {
    materialRef.current = new THREE.MeshPhongMaterial({ color: OCEAN });
  }
  const material = materialRef.current;
  const earthTexRef = useRef<THREE.Texture | null>(null);

  // Swap the material's texture/color when the mode changes.
  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    let alive = true;
    {
      if (mode === "realistic") {
        const apply = (tex: THREE.Texture) => {
          mat.map = tex;
          mat.color.set("#ffffff");
          mat.needsUpdate = true;
        };
        if (earthTexRef.current) apply(earthTexRef.current);
        else
          new THREE.TextureLoader().load(
            EARTH_TEX_URL,
            (tex: THREE.Texture) => {
              earthTexRef.current = tex;
              if (alive) apply(tex);
            },
          );
      } else {
        mat.map = null;
        mat.color.set(OCEAN);
        mat.needsUpdate = true;
      }
    }
    return () => { alive = false; };
  }, [mode, material]);

  // Cities: always shown as glow dots; only the biggest get text labels.
  const labelledCities = useMemo(() => cities.slice(0, LABELLED_CITIES), [cities]);

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      {!Globe ? (
        <GlobeFallback />
      ) : (
      <Globe
        ref={globeRef}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={material}
        // Fires when the globe instance is live. Kick the render loop, set an
        // initial camera, and configure controls so the very first frame paints on
        // its own — without this, the globe stayed blank until the first user
        // interaction (e.g. a filter click) forced a redraw. All imperative here
        // (no setState) since this fires during mount.
        onGlobeReady={() => {
          const g = globeRef.current;
          g?.resumeAnimation?.();
          g?.pointOfView?.({ lat: 20, lng: 0, altitude: 2.5 });
          configureControls();
        }}
        showGraticules={mode === "data"}
        showAtmosphere
        atmosphereColor="#6ea8ff"
        atmosphereAltitude={0.2}
        onZoom={(pov: { altitude: number }) => {
          // altitude ~2.5 (out) → 0 ; ~0.4 (in) → 1
          const z = Math.max(0, Math.min(1, (2.5 - pov.altitude) / 2.1));
          onZoom?.(z);
        }}
        // Country choropleth
        polygonsData={polygons}
        polygonAltitude={(d: any) => (codeOf(d) === selected ? 0.06 : mode === "data" ? 0.012 : 0.006)}
        polygonCapColor={capColor}
        polygonSideColor={() => "rgba(0,0,0,0.15)"}
        polygonStrokeColor={() => (mode === "data" ? "rgba(20,27,45,0.7)" : "rgba(40,50,80,0.25)")}
        polygonLabel={(d: any) => {
          const code = codeOf(d);
          const v = code ? valueFor(code) : null;
          const name = d?.properties?.name ?? "";
          const txt = v != null ? def.fmt(v) : "no data";
          return `<div style="background:var(--panel);color:var(--fg);padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px"><b>${name}</b><br/>${def.short}: ${txt}</div>`;
        }}
        onPolygonClick={(d: any) => {
          const code = codeOf(d);
          onSelect(code === selected ? null : code);
          if (code && globeRef.current) {
            const [lng, lat] = centroid(d);
            globeRef.current.pointOfView({ lat, lng, altitude: 1.6 }, 900);
          }
        }}
        // All cities as small glow dots
        pointsData={cities}
        pointLat={(d: any) => (d as City).lat}
        pointLng={(d: any) => (d as City).lng}
        pointColor={() => CITY_GLOW}
        pointAltitude={0.008}
        pointRadius={(d: any) => 0.06 + Math.min(0.4, (d as City).pop / 30_000_000)}
        pointResolution={3}
        // Biggest cities labelled by name at their real position (always on)
        labelsData={labelledCities}
        labelLat={(d: any) => (d as City).lat}
        labelLng={(d: any) => (d as City).lng}
        labelText={(d: any) => (d as City).name}
        labelSize={0.5}
        labelDotRadius={0.22}
        labelColor={() => CITY_GLOW}
        labelResolution={2}
        labelAltitude={0.01}
      />
      )}
    </div>
  );
}

function centroid(feat: any): [number, number] {
  const geom = feat.geometry;
  let coords: number[][] = [];
  if (geom.type === "Polygon") coords = geom.coordinates[0];
  else if (geom.type === "MultiPolygon") {
    let best = geom.coordinates[0][0];
    for (const poly of geom.coordinates) if (poly[0].length > best.length) best = poly[0];
    coords = best;
  }
  let x = 0, y = 0;
  for (const c of coords) { x += c[0]; y += c[1]; }
  return [x / coords.length, y / coords.length];
}
