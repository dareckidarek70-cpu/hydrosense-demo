export default function BriefPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px",
        background: "#edf3ea",
        color: "#113122",
        fontFamily: "serif",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          background:
            "radial-gradient(circle at top right, rgba(88, 153, 108, 0.22), transparent 28%), linear-gradient(135deg, #123623 0%, #1d4a31 60%, #295b3c 100%)",
          borderRadius: "32px",
          padding: "48px",
          color: "#f4f7f2",
          boxShadow: "0 30px 80px rgba(17, 49, 34, 0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: "0.95rem", opacity: 0.8, marginBottom: "8px" }}>
              HydroSense
            </div>
            <h1 style={{ margin: 0, fontSize: "3rem", lineHeight: 1.05 }}>
              Executive Parcel Brief
            </h1>
            <p style={{ marginTop: "18px", maxWidth: "760px", fontSize: "1.2rem", lineHeight: 1.7 }}>
              This is a placeholder brief page. Later we can make it dynamic and pass
              the selected parcel or custom point here.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            style={{
              border: "none",
              borderRadius: "999px",
              padding: "16px 28px",
              background: "#113122",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Export / Print Brief
          </button>
        </div>

        <div
          style={{
            marginTop: "36px",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(180px, 1fr))",
            gap: "20px",
          }}
        >
          {[
            ["Investment", "84"],
            ["Irrigation", "81"],
            ["Crop Fit", "86"],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.9)",
                color: "#113122",
                borderRadius: "24px",
                padding: "24px",
              }}
            >
              <div style={{ fontSize: "0.95rem", opacity: 0.75 }}>{label}</div>
              <div style={{ fontSize: "3rem", fontWeight: 700, marginTop: "10px" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
