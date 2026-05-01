import { useState, useMemo } from "react";

const DEFAULT = {
  pluginPrices: [49, 29, 79],
  nPlugins: 3,
  nSeats: 10,
  durationDays: 365,
  alpha: 0.7,
  beta: 0.6,
  gamma: 0.8,
  loyaltyDiscount: 0.15,
  isExisting: false,
};

function SliderRow({ label, value, min, max, step, onChange, format, hint }) {
  return (
    <div className="slider-row">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{format ? format(value) : value}</span>
      </div>
      {hint && <div className="slider-hint">{hint}</div>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider"
      />
      <div className="slider-bounds">
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
    </div>
  );
}

function FormulaBreakdown({ base, fPlugins, gSeats, hDuration, loyalty, total, isExisting }) {
  const fmt = (n) => n.toFixed(4);
  const money = (n) => "$" + n.toFixed(2);

  return (
    <div className="breakdown">
      <div className="breakdown-title">Formula Breakdown</div>
      <div className="breakdown-formula">
        Total = Base × f(plugins) × g(seats) × h(duration){isExisting ? " × loyalty" : ""}
      </div>
      <div className="breakdown-rows">
        <div className="brow">
          <span className="brow-label">Base (Σ plugin prices)</span>
          <span className="brow-val">{money(base)}</span>
        </div>
        <div className="brow op">×</div>
        <div className="brow">
          <span className="brow-label">f(plugins) = N^α</span>
          <span className="brow-val">{fmt(fPlugins)}</span>
        </div>
        <div className="brow op">×</div>
        <div className="brow">
          <span className="brow-label">g(seats) = N^β</span>
          <span className="brow-val">{fmt(gSeats)}</span>
        </div>
        <div className="brow op">×</div>
        <div className="brow">
          <span className="brow-label">h(duration) = days^γ</span>
          <span className="brow-val">{fmt(hDuration)}</span>
        </div>
        {isExisting && (
          <>
            <div className="brow op">×</div>
            <div className="brow loyalty">
              <span className="brow-label">Loyalty multiplier</span>
              <span className="brow-val">{fmt(loyalty)}</span>
            </div>
          </>
        )}
        <div className="brow total">
          <span className="brow-label">Total Price</span>
          <span className="brow-val">{money(total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [p, setP] = useState(DEFAULT);

  const update = (key) => (val) => setP((prev) => ({ ...prev, [key]: val }));

  const calc = useMemo(() => {
    const base = p.pluginPrices.slice(0, p.nPlugins).reduce((a, b) => a + b, 0);
    const fPlugins = Math.pow(p.nPlugins, p.alpha);
    const gSeats = Math.pow(p.nSeats, p.beta);
    const hDuration = Math.pow(p.durationDays, p.gamma);
    const loyalty = p.isExisting ? 1 - p.loyaltyDiscount : 1;
    const total = base * fPlugins * gSeats * hDuration * loyalty;
    const linearTotal = base * p.nPlugins * p.nSeats * p.durationDays;
    const saving = linearTotal > 0 ? ((1 - total / linearTotal) * 100) : 0;
    return { base, fPlugins, gSeats, hDuration, loyalty, total, linearTotal, saving };
  }, [p]);

  const pluginList = [
    { name: "Link Copier", price: 49 },
    { name: "Room Book", price: 29 },
    { name: "Room Finishing", price: 79 },
    { name: "Exporter", price: 99 },
    { name: "Translator", price: 19 },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0a0a0f;
          color: #e8e4dc;
          font-family: 'Syne', sans-serif;
          min-height: 100vh;
        }

        .app {
          max-width: 960px;
          margin: 0 auto;
          padding: 48px 24px;
        }

        .header {
          margin-bottom: 48px;
        }

        .header-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          color: #7c6af0;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .header-title {
          font-size: clamp(28px, 5vw, 48px);
          font-weight: 800;
          line-height: 1.05;
          color: #f5f0e8;
        }

        .header-title span {
          color: #7c6af0;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        @media (max-width: 640px) {
          .grid { grid-template-columns: 1fr; }
        }

        .card {
          background: #111118;
          border: 1px solid #1e1e2e;
          border-radius: 12px;
          padding: 24px;
        }

        .card-title {
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #7c6af0;
          margin-bottom: 20px;
        }

        .slider-row {
          margin-bottom: 22px;
        }

        .slider-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }

        .slider-label {
          font-size: 14px;
          font-weight: 600;
          color: #c8c0b4;
        }

        .slider-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: #f5f0e8;
          background: #1e1e2e;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .slider-hint {
          font-size: 11px;
          color: #4a4a5e;
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 6px;
        }

        .slider {
          width: 100%;
          -webkit-appearance: none;
          height: 3px;
          background: linear-gradient(to right, #7c6af0, #1e1e2e);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: #7c6af0;
          border-radius: 50%;
          box-shadow: 0 0 0 3px #0a0a0f, 0 0 0 5px #7c6af055;
          transition: box-shadow 0.15s;
        }

        .slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 3px #0a0a0f, 0 0 0 7px #7c6af088;
        }

        .slider-bounds {
          display: flex;
          justify-content: space-between;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #3a3a4e;
          margin-top: 4px;
        }

        .plugin-selector {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 8px;
        }

        .plugin-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #1e1e2e;
          background: #0a0a0f;
          cursor: pointer;
          transition: all 0.15s;
          user-select: none;
        }

        .plugin-chip.active {
          border-color: #7c6af0;
          background: #7c6af015;
        }

        .plugin-chip-name {
          font-size: 13px;
          font-weight: 600;
          color: #c8c0b4;
        }

        .plugin-chip.active .plugin-chip-name {
          color: #e8e4dc;
        }

        .plugin-chip-price {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: #4a4a5e;
        }

        .plugin-chip.active .plugin-chip-price {
          color: #7c6af0;
        }

        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          border-top: 1px solid #1e1e2e;
          margin-top: 8px;
        }

        .toggle-label {
          font-size: 14px;
          font-weight: 600;
          color: #c8c0b4;
        }

        .toggle {
          width: 40px;
          height: 22px;
          background: #1e1e2e;
          border-radius: 11px;
          position: relative;
          cursor: pointer;
          transition: background 0.2s;
        }

        .toggle.on {
          background: #7c6af0;
        }

        .toggle-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }

        .toggle.on .toggle-knob {
          transform: translateX(18px);
        }

        .result-card {
          background: linear-gradient(135deg, #13131f, #1a1228);
          border: 1px solid #7c6af044;
          border-radius: 12px;
          padding: 28px;
          margin-top: 20px;
          position: relative;
          overflow: hidden;
        }

        .result-card::before {
          content: '';
          position: absolute;
          top: -40px;
          right: -40px;
          width: 120px;
          height: 120px;
          background: radial-gradient(circle, #7c6af022, transparent 70%);
          border-radius: 50%;
        }

        .result-price {
          font-size: clamp(36px, 6vw, 56px);
          font-weight: 800;
          color: #f5f0e8;
          line-height: 1;
          margin-bottom: 8px;
        }

        .result-price span {
          color: #7c6af0;
          font-size: 0.6em;
          vertical-align: super;
        }

        .result-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #4a4a5e;
          margin-bottom: 20px;
        }

        .saving-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #7c6af022;
          border: 1px solid #7c6af044;
          border-radius: 6px;
          padding: 5px 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #a89af0;
        }

        .breakdown {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #1e1e2e;
        }

        .breakdown-title {
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #4a4a5e;
          margin-bottom: 12px;
        }

        .breakdown-formula {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: #7c6af0;
          background: #0a0a0f;
          border: 1px solid #1e1e2e;
          border-radius: 6px;
          padding: 10px 14px;
          margin-bottom: 16px;
        }

        .breakdown-rows {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .brow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          border-radius: 6px;
          background: #0f0f18;
        }

        .brow.op {
          background: transparent;
          justify-content: flex-start;
          padding: 0 10px;
          font-size: 16px;
          color: #3a3a4e;
        }

        .brow.loyalty {
          background: #7c6af011;
          border: 1px solid #7c6af033;
        }

        .brow.total {
          background: #7c6af018;
          border: 1px solid #7c6af055;
          margin-top: 8px;
          padding: 10px 14px;
        }

        .brow-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #6a6a7e;
        }

        .brow.total .brow-label {
          color: #a89af0;
          font-weight: 500;
        }

        .brow-val {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: #c8c0b4;
        }

        .brow.total .brow-val {
          color: #f5f0e8;
          font-size: 14px;
          font-weight: 500;
        }

        .full-span {
          grid-column: 1 / -1;
        }
      `}</style>

      <div className="app">
        <div className="header">
          <div className="header-eyebrow">Pricing Model Explorer</div>
          <h1 className="header-title">License <span>Formula</span><br />Sandbox</h1>
        </div>

        <div className="grid">
          {/* Plugins */}
          <div className="card">
            <div className="card-title">Plugin Selection</div>
            <div className="plugin-selector">
              {pluginList.map((pl, i) => {
                const selected = p.selectedPlugins
                  ? p.selectedPlugins.includes(i)
                  : i < p.nPlugins;
                return (
                  <div
                    key={i}
                    className={`plugin-chip ${selected ? "active" : ""}`}
                    onClick={() => {
                      const current = p.selectedPlugins ?? pluginList.map((_, j) => j < p.nPlugins ? j : -1).filter(j => j >= 0);
                      const next = current.includes(i)
                        ? current.filter(x => x !== i)
                        : [...current, i];
                      const prices = next.map(idx => pluginList[idx].price);
                      setP(prev => ({
                        ...prev,
                        selectedPlugins: next,
                        nPlugins: next.length || 1,
                        pluginPrices: prices.length ? prices : [0],
                      }));
                    }}
                  >
                    <span className="plugin-chip-name">{pl.name}</span>
                    <span className="plugin-chip-price">${pl.price}/mo</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seats & Duration */}
          <div className="card">
            <div className="card-title">Seats & Duration</div>
            <SliderRow
              label="Number of Seats"
              value={p.nSeats}
              min={1} max={50} step={1}
              onChange={update("nSeats")}
            />
            <SliderRow
              label="License Duration"
              value={p.durationDays}
              min={30} max={1095} step={1}
              onChange={update("durationDays")}
              format={(v) => v >= 365 ? `${(v / 365).toFixed(1)}yr` : `${v}d`}
            />
          </div>

          {/* Exponents */}
          <div className="card">
            <div className="card-title">Scaling Exponents</div>
            <SliderRow
              label="α — Plugin count scaling"
              value={p.alpha}
              min={0.1} max={1.0} step={0.05}
              onChange={update("alpha")}
              format={(v) => v.toFixed(2)}
              hint="1.0 = linear · lower = steeper discount"
            />
            <SliderRow
              label="β — Seat scaling"
              value={p.beta}
              min={0.1} max={1.0} step={0.05}
              onChange={update("beta")}
              format={(v) => v.toFixed(2)}
              hint="1.0 = linear · lower = steeper discount"
            />
            <SliderRow
              label="γ — Duration scaling"
              value={p.gamma}
              min={0.1} max={1.0} step={0.05}
              onChange={update("gamma")}
              format={(v) => v.toFixed(2)}
              hint="1.0 = linear · lower = steeper discount"
            />
          </div>

          {/* Loyalty */}
          <div className="card">
            <div className="card-title">Loyalty Discount</div>
            <SliderRow
              label="Discount Rate"
              value={p.loyaltyDiscount}
              min={0} max={0.5} step={0.01}
              onChange={update("loyaltyDiscount")}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              hint="Applied if existing license holder"
            />
            <div className="toggle-row">
              <span className="toggle-label">Existing license holder</span>
              <div
                className={`toggle ${p.isExisting ? "on" : ""}`}
                onClick={() => setP(prev => ({ ...prev, isExisting: !prev.isExisting }))}
              >
                <div className="toggle-knob" />
              </div>
            </div>
          </div>

          {/* Result */}
          <div className="card result-card full-span">
            <div className="result-price">
              <span>$</span>{calc.total.toFixed(2)}
            </div>
            <div className="result-sub">computed license price</div>
            <div className="saving-badge">
              vs linear: ${calc.linearTotal.toFixed(2)} — {calc.saving.toFixed(1)}% sublinear reduction
            </div>
            <FormulaBreakdown {...calc} isExisting={p.isExisting} />
          </div>
        </div>
      </div>
    </>
  );
}