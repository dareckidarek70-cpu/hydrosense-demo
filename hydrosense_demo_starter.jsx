import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Polygon, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const parcels = [
  {
    id: "PARCEL-A",
    name: "Parcel A — Veneto North",
    area: "184 hectares",
    terrain: "Mixed agricultural plot",
    cropModel: "Cereals and rotation crops",
    center: [45.52, 12.18],
    polygon: [
      [45.528, 12.145],
      [45.533, 12.205],
      [45.505, 12.215],
      [45.498, 12.16],
    ],
    scores: { investment: 72, irrigation: 68, cropFit: 75, risk: "Medium" },
  },
  {
    id: "PARCEL-B",
    name: "Parcel B — Mestre Plain",
    area: "212 hectares",
    terrain: "Flat irrigable plain",
    cropModel: "Vegetable and maize rotation",
    center: [45.47, 12.28],
    polygon: [
      [45.485, 12.235],
      [45.492, 12.31],
      [45.455, 12.332],
      [45.446, 12.248],
    ],
    scores: { investment: 84, irrigation: 81, cropFit: 86, risk: "Low" },
  },
  {
    id: "PARCEL-C",
    name: "Parcel C — Coastal Belt",
    area: "196 hectares",
    terrain: "Coastal belt with mixed exposure",
    cropModel: "Salt-tolerant mixed crops",
    center: [45.39, 12.45],
    polygon: [
      [45.408, 12.415],
      [45.418, 12.478],
      [45.382, 12.502],
      [45.368, 12.432],
    ],
    scores: { investment: 63, irrigation: 58, cropFit: 69, risk: "Medium" },
  },
];

const defaultPoint = { lat: 45.47, lng: 12.28 };

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function scoreRiskLabel(risk) {
  if (risk === "Low") return "Low";
  if (risk === "Medium") return "Medium";
  return "High";
}

function inferLiveScores(lat, lng, selectedParcel) {
  const base = selectedParcel?.scores ?? { investment: 70, irrigation: 66, cropFit: 73, risk: "Medium" };
  const latSeed = Math.abs(Math.round(lat * 1000)) % 7;
  const lngSeed = Math.abs(Math.round(lng * 1000)) % 6;

  const investment = Math.min(92, Math.max(54, base.investment + latSeed - 3));
  const irrigation = Math.min(91, Math.max(49, base.irrigation + lngSeed - 2));
  const cropFit = Math.min(93, Math.max(52, base.cropFit + ((latSeed + lngSeed) % 5) - 2));
  const risk = investment >= 80 && irrigation >= 78 ? "Low" : investment >= 66 ? "Medium" : "High";

  return {
    investment,
    irrigation,
    cropFit,
    risk,
    summary:
      risk === "Low"
        ? "Location appears strong for executive review, pilot irrigation planning, and diversified cultivation scenarios."
        : risk === "Medium"
          ? "Location shows mixed suitability and would benefit from field validation before budget commitment."
          : "Location presents elevated uncertainty and should be reviewed carefully before investment decisions.",
    signals: {
      sourceStack: "Copernicus Sentinel + GIS overlays + terrain model",
      soilMoisture: irrigation >= 78 ? "Good seasonal moisture context" : "Moderate moisture context",
      terrain: investment >= 78 ? "Low slope profile" : "Mixed slope exposure",
      cropAlignment: cropFit >= 80 ? "Strong crop-fit alignment" : "Partial crop-fit alignment",
    },
  };
}

function ClickCapture({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return null;
}

function ScorePill({ label, value }) {
  return (
    <div style={styles.scorePill}>
      <div style={styles.scorePillLabel}>{label}</div>
      <div style={styles.scorePillValue}>{value}</div>
    </div>
  );
}

function NavButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.navButton,
        ...(active ? styles.navButtonActive : null),
      }}
    >
      {children}
    </button>
  );
}

export default function HydroSenseDemoStarter() {
  const [page, setPage] = useState("home");
  const [selectedParcelId, setSelectedParcelId] = useState("PARCEL-B");
  const [selectedPoint, setSelectedPoint] = useState(defaultPoint);

  const selectedParcel = useMemo(
    () => parcels.find((p) => p.id === selectedParcelId) ?? parcels[1],
    [selectedParcelId]
  );

  const liveAnalysis = useMemo(
    () => inferLiveScores(selectedPoint.lat, selectedPoint.lng, selectedParcel),
    [selectedPoint, selectedParcel]
  );

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.brandWrap}>
          <div style={styles.brandMark}>H</div>
          <div>
            <div style={styles.brandName}>HydroSense</div>
            <div style={styles.brandSub}>PARCEL INTELLIGENCE</div>
          </div>
        </div>

        <nav style={styles.nav}>
          <NavButton active={page === "home"} onClick={() => setPage("home")}>Home</NavButton>
          <NavButton active={page === "select"} onClick={() => setPage("select")}>Select Area</NavButton>
          <NavButton active={page === "brief"} onClick={() => setPage("brief")}>Brief</NavButton>
        </nav>
      </header>

      <main style={styles.main}>
        {page === "home" && (
          <section style={styles.heroGrid}>
            <div>
              <div style={styles.eyebrow}>AI-assisted parcel review</div>
              <h1 style={styles.heroTitle}>Assess land before capital is committed.</h1>
              <p style={styles.heroText}>
                HydroSense combines parcel selection, point-based map review, and a concise executive brief for
                investor-facing land intelligence demos.
              </p>
              <div style={styles.heroActions}>
                <button style={styles.primaryCta} onClick={() => setPage("select")}>Start Demo</button>
                <button style={styles.secondaryCta} onClick={() => setPage("brief")}>View Brief</button>
              </div>
            </div>

            <div style={styles.heroPanel}>
              <div style={styles.heroPanelTop}>Parcel B — Mestre Plain</div>
              <div style={styles.heroStatsGrid}>
                <div style={styles.heroStatCard}>
                  <div style={styles.heroMetric}>{liveAnalysis.investment}</div>
                  <div style={styles.heroMetricLabel}>Investment suitability</div>
                </div>
                <div style={styles.heroStatCard}>
                  <div style={styles.heroMetric}>{liveAnalysis.irrigation}</div>
                  <div style={styles.heroMetricLabel}>Irrigation readiness</div>
                </div>
                <div style={styles.heroStatCard}>
                  <div style={styles.heroMetric}>{liveAnalysis.cropFit}</div>
                  <div style={styles.heroMetricLabel}>Crop fit score</div>
                </div>
                <div style={styles.heroStatCard}>
                  <div style={styles.heroMetric}>{liveAnalysis.risk}</div>
                  <div style={styles.heroMetricLabel}>Risk level</div>
                </div>
              </div>
              <div style={styles.heroNote}>Live demo state updates from map click and parcel selection.</div>
            </div>
          </section>
        )}

        {page === "select" && (
          <section>
            <div style={styles.sectionIntro}>
              <div style={styles.eyebrow}>Select area</div>
              <h2 style={styles.sectionTitle}>Choose parcel and click map to inspect the live point context.</h2>
              <p style={styles.sectionText}>
                Parcel choice defines the business frame. Point selection refines the live executive signal.
              </p>
            </div>

            <div style={styles.selectGrid}>
              <div style={styles.mapCard}>
                <MapContainer center={selectedParcel.center} zoom={11} style={{ width: "100%", height: "640px", borderRadius: 28 }}>
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <ClickCapture onPick={setSelectedPoint} />

                  {parcels.map((parcel) => (
                    <Polygon
                      key={parcel.id}
                      positions={parcel.polygon}
                      pathOptions={{
                        color: parcel.id === selectedParcelId ? "#8ad39d" : "#b7d7bf",
                        weight: parcel.id === selectedParcelId ? 3 : 2,
                        fillOpacity: parcel.id === selectedParcelId ? 0.22 : 0.1,
                      }}
                      eventHandlers={{
                        click: () => setSelectedParcelId(parcel.id),
                      }}
                    >
                      <Popup>{parcel.name}</Popup>
                    </Polygon>
                  ))}

                  <Marker position={[selectedPoint.lat, selectedPoint.lng]} icon={markerIcon}>
                    <Popup>
                      Selected point<br />
                      {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>

              <aside style={styles.sidePanel}>
                <div style={styles.panelCard}>
                  <div style={styles.panelLabel}>Selected parcel</div>
                  <h3 style={styles.panelTitle}>{selectedParcel.name}</h3>
                  <p style={styles.panelText}>
                    Click a polygon to switch parcel context. Then click any point on the map to simulate live
                    Copernicus + GIS evaluation for that location.
                  </p>

                  <div style={styles.infoGrid}>
                    <div>
                      <div style={styles.infoLabel}>Parcel ID</div>
                      <div style={styles.infoValue}>{selectedParcel.id}</div>
                    </div>
                    <div>
                      <div style={styles.infoLabel}>Area</div>
                      <div style={styles.infoValue}>{selectedParcel.area}</div>
                    </div>
                    <div>
                      <div style={styles.infoLabel}>Terrain type</div>
                      <div style={styles.infoValue}>{selectedParcel.terrain}</div>
                    </div>
                    <div>
                      <div style={styles.infoLabel}>Current crop model</div>
                      <div style={styles.infoValue}>{selectedParcel.cropModel}</div>
                    </div>
                  </div>
                </div>

                <div style={styles.panelCard}>
                  <div style={styles.panelLabel}>Selected point</div>
                  <div style={styles.pointRow}>
                    <span>Lat</span>
                    <strong>{selectedPoint.lat.toFixed(5)}</strong>
                  </div>
                  <div style={styles.pointRow}>
                    <span>Lng</span>
                    <strong>{selectedPoint.lng.toFixed(5)}</strong>
                  </div>

                  <div style={styles.scorePillRow}>
                    <ScorePill label="Investment" value={liveAnalysis.investment} />
                    <ScorePill label="Irrigation" value={liveAnalysis.irrigation} />
                    <ScorePill label="Crop fit" value={liveAnalysis.cropFit} />
                  </div>

                  <div style={styles.sourceBlock}>
                    <div style={styles.infoLabel}>Live source stack</div>
                    <div style={styles.panelText}>{liveAnalysis.signals.sourceStack}</div>
                  </div>

                  <button style={styles.primaryWide} onClick={() => setPage("brief")}>Generate Brief</button>
                </div>
              </aside>
            </div>
          </section>
        )}

        {page === "brief" && (
          <section style={styles.briefShell}>
            <div style={styles.briefHero}>
              <div style={styles.briefTopRow}>
                <div>
                  <div style={styles.eyebrowLight}>Decision-ready review</div>
                  <h2 style={styles.briefTitle}>{selectedParcel.name}</h2>
                  <p style={styles.briefLead}>{liveAnalysis.summary}</p>
                </div>
                <button style={styles.exportButton}>Export / Print Brief</button>
              </div>

              <div style={styles.briefMetaRow}>
                <div>
                  <div style={styles.briefMetaLabel}>Generated from</div>
                  <div style={styles.briefMetaValue}>Selected parcel + live point context</div>
                </div>
                <div>
                  <div style={styles.briefMetaLabel}>Current coordinates</div>
                  <div style={styles.briefMetaValue}>
                    {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
                  </div>
                </div>
                <div>
                  <div style={styles.briefMetaLabel}>Risk level</div>
                  <div style={styles.briefMetaValue}>{scoreRiskLabel(liveAnalysis.risk)}</div>
                </div>
              </div>
            </div>

            <div style={styles.briefGrid}>
              <div style={styles.briefNarrativeCard}>
                <div style={styles.panelLabel}>Executive verdict</div>
                <h3 style={styles.narrativeTitle}>
                  {liveAnalysis.risk === "Low"
                    ? "Well suited for executive review, cultivation planning, and irrigation pilot deployment."
                    : liveAnalysis.risk === "Medium"
                      ? "Promising profile with moderate caveats that should be field-validated."
                      : "Elevated uncertainty makes near-term investment less compelling."}
                </h3>
                <p style={styles.panelText}>
                  {selectedParcel.name} is assessed using a combined parcel frame and point-level live context. The
                  current signal suggests {liveAnalysis.signals.soilMoisture.toLowerCase()}, {liveAnalysis.signals.terrain.toLowerCase()}, and {liveAnalysis.signals.cropAlignment.toLowerCase()}.
                </p>
                <div style={styles.tagRow}>
                  <span style={styles.tag}>{selectedParcel.area}</span>
                  <span style={styles.tag}>{selectedParcel.terrain}</span>
                  <span style={styles.tag}>{liveAnalysis.signals.sourceStack}</span>
                </div>
              </div>

              <div style={styles.briefScoreGrid}>
                <div style={styles.scoreCard}>
                  <div style={styles.scoreCardNumber}>{liveAnalysis.investment}</div>
                  <div style={styles.scoreCardTitle}>Investment suitability</div>
                  <div style={styles.scoreCardText}>Executive view of commercial attractiveness.</div>
                </div>
                <div style={styles.scoreCard}>
                  <div style={styles.scoreCardNumber}>{liveAnalysis.irrigation}</div>
                  <div style={styles.scoreCardTitle}>Irrigation readiness</div>
                  <div style={styles.scoreCardText}>How compelling the irrigation opportunity appears.</div>
                </div>
                <div style={styles.scoreCard}>
                  <div style={styles.scoreCardNumber}>{liveAnalysis.cropFit}</div>
                  <div style={styles.scoreCardTitle}>Crop fit score</div>
                  <div style={styles.scoreCardText}>Strength of alignment between parcel profile and crop model.</div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #eff4eb 0%, #edf3ea 100%)",
    color: "#133122",
    fontFamily: 'Georgia, "Times New Roman", serif',
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "22px 40px",
    background: "rgba(239, 244, 235, 0.92)",
    backdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(19, 49, 34, 0.08)",
  },
  brandWrap: { display: "flex", alignItems: "center", gap: 14 },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: 28,
    background: "linear-gradient(135deg, #2a6e46 0%, #7bc38c 100%)",
    boxShadow: "0 14px 32px rgba(36, 107, 68, 0.22)",
  },
  brandName: { fontSize: 24, fontWeight: 700, lineHeight: 1 },
  brandSub: { fontSize: 14, letterSpacing: "0.08em", color: "#597163", marginTop: 4 },
  nav: { display: "flex", gap: 12 },
  navButton: {
    border: "none",
    background: "#ffffff",
    color: "#284836",
    padding: "14px 22px",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
    boxShadow: "0 4px 14px rgba(19,49,34,0.04)",
  },
  navButtonActive: {
    background: "#123c28",
    color: "#f7fff8",
  },
  main: { padding: 40, maxWidth: 1440, margin: "0 auto" },
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "1.05fr 0.95fr",
    gap: 32,
    alignItems: "stretch",
    minHeight: "calc(100vh - 170px)",
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    color: "#2d7a4c",
    fontSize: 14,
    marginBottom: 18,
  },
  eyebrowLight: {
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    color: "rgba(240,248,242,0.86)",
    fontSize: 14,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: "clamp(72px, 8vw, 116px)",
    lineHeight: 0.88,
    letterSpacing: "-0.06em",
    margin: "0 0 28px",
    maxWidth: "7.2ch",
  },
  heroText: {
    fontSize: 20,
    lineHeight: 1.65,
    color: "#587163",
    maxWidth: 720,
    marginBottom: 32,
  },
  heroActions: { display: "flex", gap: 16, flexWrap: "wrap" },
  primaryCta: {
    border: "none",
    background: "#123c28",
    color: "#f7fff8",
    borderRadius: 999,
    padding: "20px 34px",
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryCta: {
    border: "1px solid rgba(19,49,34,0.1)",
    background: "#ffffff",
    color: "#284836",
    borderRadius: 999,
    padding: "20px 34px",
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
  },
  heroPanel: {
    borderRadius: 36,
    padding: 30,
    background: "radial-gradient(circle at 40% 30%, rgba(74,122,83,0.3), transparent 35%), linear-gradient(160deg, #143c29 0%, #1f5637 100%)",
    color: "#f4fff6",
    boxShadow: "0 28px 70px rgba(19,49,34,0.16)",
    display: "grid",
    gap: 24,
  },
  heroPanelTop: {
    fontSize: 54,
    lineHeight: 0.94,
    letterSpacing: "-0.05em",
    fontWeight: 700,
    maxWidth: "7ch",
  },
  heroStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
  },
  heroStatCard: {
    background: "rgba(255,255,255,0.09)",
    borderRadius: 24,
    padding: 24,
    minHeight: 150,
  },
  heroMetric: {
    fontSize: 64,
    lineHeight: 0.9,
    letterSpacing: "-0.06em",
    marginBottom: 12,
  },
  heroMetricLabel: {
    fontSize: 18,
    lineHeight: 1.35,
    color: "rgba(240,248,242,0.84)",
  },
  heroNote: { color: "rgba(240,248,242,0.78)", fontSize: 16, lineHeight: 1.6 },
  sectionIntro: { marginBottom: 28 },
  sectionTitle: { fontSize: 58, lineHeight: 0.96, margin: "0 0 18px", letterSpacing: "-0.05em", maxWidth: 980 },
  sectionText: { fontSize: 20, lineHeight: 1.65, color: "#587163", maxWidth: 900 },
  selectGrid: { display: "grid", gridTemplateColumns: "1.35fr 0.75fr", gap: 28, alignItems: "start" },
  mapCard: {
    padding: 16,
    borderRadius: 34,
    background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,245,0.82))",
    boxShadow: "0 22px 64px rgba(19,44,30,0.1)",
    border: "1px solid rgba(18,51,30,0.1)",
  },
  sidePanel: { display: "grid", gap: 20 },
  panelCard: {
    padding: 28,
    borderRadius: 30,
    background: "rgba(255,255,255,0.86)",
    boxShadow: "0 22px 64px rgba(19,44,30,0.1)",
    border: "1px solid rgba(18,51,30,0.1)",
  },
  panelLabel: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#5f7a6a",
    marginBottom: 14,
  },
  panelTitle: { fontSize: 28, lineHeight: 1.02, margin: "0 0 14px" },
  panelText: { color: "#5a7264", fontSize: 18, lineHeight: 1.65, margin: 0 },
  infoGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18, marginTop: 24 },
  infoLabel: { color: "#6a8074", fontSize: 14, marginBottom: 8 },
  infoValue: { fontWeight: 700, fontSize: 18, lineHeight: 1.2 },
  pointRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid rgba(19,49,34,0.08)",
    fontSize: 17,
  },
  scorePillRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginTop: 20,
  },
  scorePill: {
    borderRadius: 20,
    padding: 16,
    background: "linear-gradient(180deg, rgba(17,49,34,0.05), rgba(17,49,34,0.02))",
    border: "1px solid rgba(17,49,34,0.08)",
  },
  scorePillLabel: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#6b8274",
    marginBottom: 10,
  },
  scorePillValue: { fontSize: 38, lineHeight: 0.95, letterSpacing: "-0.05em", fontWeight: 700 },
  sourceBlock: { marginTop: 20 },
  primaryWide: {
    marginTop: 24,
    width: "100%",
    border: "none",
    background: "#123c28",
    color: "#f7fff8",
    borderRadius: 999,
    padding: "18px 24px",
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
  },
  briefShell: { display: "grid", gap: 26 },
  briefHero: {
    padding: 34,
    borderRadius: 38,
    color: "#f4fff6",
    background: "radial-gradient(circle at 70% 25%, rgba(74,122,83,0.3), transparent 28%), linear-gradient(160deg, #143c29 0%, #1f5637 100%)",
    boxShadow: "0 28px 70px rgba(19,49,34,0.16)",
  },
  briefTopRow: { display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start" },
  briefTitle: { margin: 0, fontSize: 54, lineHeight: 0.94, letterSpacing: "-0.05em" },
  briefLead: { marginTop: 18, fontSize: 20, lineHeight: 1.7, color: "rgba(240,248,242,0.9)", maxWidth: 900 },
  exportButton: {
    border: "none",
    background: "#123c28",
    color: "#f7fff8",
    borderRadius: 999,
    padding: "18px 26px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
  },
  briefMetaRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 18,
    marginTop: 28,
    paddingTop: 22,
    borderTop: "1px solid rgba(232,247,236,0.16)",
  },
  briefMetaLabel: { color: "rgba(240,248,242,0.76)", fontSize: 14, marginBottom: 8 },
  briefMetaValue: { fontSize: 20, fontWeight: 700 },
  briefGrid: { display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 26, alignItems: "start" },
  briefNarrativeCard: {
    padding: 30,
    borderRadius: 32,
    background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(18,51,30,0.1)",
    boxShadow: "0 22px 64px rgba(19,44,30,0.1)",
  },
  narrativeTitle: { fontSize: 42, lineHeight: 0.98, letterSpacing: "-0.045em", margin: "0 0 18px" },
  tagRow: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 },
  tag: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(17,49,34,0.06)",
    border: "1px solid rgba(17,49,34,0.08)",
    color: "#284836",
    fontSize: 15,
  },
  briefScoreGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18 },
  scoreCard: {
    padding: 28,
    borderRadius: 32,
    background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,245,0.82))",
    border: "1px solid rgba(18,51,30,0.1)",
    boxShadow: "0 22px 64px rgba(19,44,30,0.1)",
    minHeight: 260,
  },
  scoreCardNumber: { fontSize: 72, lineHeight: 0.88, letterSpacing: "-0.06em", color: "#4e6d5d", marginBottom: 18 },
  scoreCardTitle: { fontSize: 22, lineHeight: 1.05, fontWeight: 700, marginBottom: 12 },
  scoreCardText: { fontSize: 18, lineHeight: 1.65, color: "#5a7264" },
};
