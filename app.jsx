const { useState, useMemo } = React;

const DAYS_PER_YEAR = 365;

// Fixed, selectable tiers for the two demand axes.
const SEAT_OPTIONS = [1, 3, 10, 30, 100];
const DURATION_OPTIONS = [
  { label: "1 yr", years: 1 },
  { label: "2 yr", years: 2 },
  { label: "3 yr", years: 3 },
  { label: "5 yr", years: 5 },
];

// ── Pricing policy (mirrors the backend Commerce:Pricing config) ───────────────────────────
// Set discounts, not a formula. Monotonic by construction; explainable to a customer.
//
// Seats — GRADUATED tiers: seats in the band [minSeats, nextMinSeats−1] are charged at
//   (1 − discount/100) of the base. Deeper tiers discount at least as much (a discount, never a
//   surcharge). The first tier always covers from seat 1.
const DEFAULT_SEAT_TIERS = [
  { minSeats: 1,  discount: 0 },
  { minSeats: 11, discount: 10 },
  { minSeats: 51, discount: 20 },
];

// Duration — FLAT % discount per term (multi-year prepay). Keyed by whole years.
const DEFAULT_TERM_DISCOUNTS = { 1: 0, 2: 10, 3: 15, 5: 20 };

// Products — LINEAR. No count discount: the base is just the sum of the named items' annual
// prices. A multi-product discount is expressed by pricing a PACKAGE below the sum of its
// members (a curated bundle SKU), which is monotonic by construction — so there is no product δ.
const pluginList = [
  { name: "ARCH Standard",  price: 50 },
  { name: "MECH Standard",  price: 50 },
  { name: "ELEC Standard",  price: 50 },
  { name: "STRUC Standard", price: 50 },
  { name: "BIM Standard",   price: 50 },
];

const DEFAULT = {
  selectedPlugins: [0, 1, 2, 3, 4],
  pluginPrices: [50, 50, 50, 50, 50],
  nSeats: 10,
  years: 1,
};

const num = (v) => parseFloat(v) || 0;
const money = (n) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Section({ label, hint, children }) {
  return (
    <section className="section">
      <div className="section-label">
        <span>{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`segmented-option ${value === opt.value ? "active" : ""}`}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// A compact "chip" row carrying a label on the left and an editable percent on the right —
// reused by both the seat-tier and per-term discount editors.
function PctRow({ label, value, onChange, onRemove, min = 0, max = 99 }) {
  return (
    <div className="plugin-chip">
      <span className="plugin-chip-name">{label}</span>
      <span className="plugin-chip-price" onClick={(e) => e.stopPropagation()}>
        <input
          className="plugin-chip-price-input"
          type="number"
          min={min}
          max={max}
          step="1"
          value={value}
          aria-label={`${label} discount percent`}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="plugin-chip-unit">% off</span>
        {onRemove && (
          <button type="button" className="plugin-add-cancel" onClick={onRemove} aria-label="Remove tier">×</button>
        )}
      </span>
    </div>
  );
}

function Breakdown({ base, seatFactor, years, termDiscount, annual, total }) {
  const fmt = (n) => n.toFixed(4);
  return (
    <div className="breakdown">
      <div className="breakdown-label">Breakdown</div>
      <div className="breakdown-formula">
        Σ prices × effective seats × years × (1 − term discount)
      </div>
      <div className="brows">
        <div className="brow">
          <span className="brow-label">Base bundle (Σ prices, /seat·yr)</span>
          <span className="brow-leader" />
          <span className="brow-val">{money(base)}</span>
        </div>
        <div className="brow">
          <span className="brow-label">× effective seats (graduated)</span>
          <span className="brow-leader" />
          <span className="brow-val">{fmt(seatFactor)}</span>
        </div>
        <div className="brow">
          <span className="brow-label">= annual (all seats)</span>
          <span className="brow-leader" />
          <span className="brow-val">{money(annual)}</span>
        </div>
        <div className="brow">
          <span className="brow-label">× years</span>
          <span className="brow-leader" />
          <span className="brow-val">{years}</span>
        </div>
        <div className="brow">
          <span className="brow-label">× (1 − term discount)</span>
          <span className="brow-leader" />
          <span className="brow-val">{fmt(1 - termDiscount)}</span>
        </div>
        <div className="brow total">
          <span className="brow-label">Total</span>
          <span className="brow-leader" />
          <span className="brow-val">{money(total)}</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [p, setP] = useState(DEFAULT);
  const [plugins, setPlugins] = useState(pluginList);
  const [seatTiers, setSeatTiers] = useState(DEFAULT_SEAT_TIERS);
  const [termDiscounts, setTermDiscounts] = useState(DEFAULT_TERM_DISCOUNTS);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", price: "" });

  const update = (key) => (val) => setP((prev) => ({ ...prev, [key]: val }));
  const pricesFor = (list, selected) => selected.map((idx) => num(list[idx].price));

  // ── Product editing ─────────────────────────────────────────────
  function togglePlugin(i) {
    const current = p.selectedPlugins ?? [];
    const next = current.includes(i) ? current.filter((x) => x !== i) : [...current, i];
    setP((prev) => ({ ...prev, selectedPlugins: next, pluginPrices: pricesFor(plugins, next) }));
  }
  function editPrice(i, value) {
    const next = plugins.map((pl, idx) => (idx === i ? { ...pl, price: value } : pl));
    setPlugins(next);
    setP((prev) => ({ ...prev, pluginPrices: pricesFor(next, prev.selectedPlugins ?? []) }));
  }
  function addPlugin() {
    const name = draft.name.trim();
    const price = parseFloat(draft.price);
    if (!name || !(price > 0)) return;
    const newIdx = plugins.length;
    const nextPlugins = [...plugins, { name, price }];
    const next = [...(p.selectedPlugins ?? []), newIdx];
    setPlugins(nextPlugins);
    setP((prev) => ({ ...prev, selectedPlugins: next, pluginPrices: pricesFor(nextPlugins, next) }));
    setDraft({ name: "", price: "" });
    setAdding(false);
  }
  function cancelAdd() {
    setDraft({ name: "", price: "" });
    setAdding(false);
  }

  // ── Seat-tier editing ───────────────────────────────────────────
  function editTierDiscount(i, value) {
    setSeatTiers((ts) => ts.map((t, idx) => (idx === i ? { ...t, discount: num(value) } : t)));
  }
  function editTierThreshold(i, value) {
    setSeatTiers((ts) => ts.map((t, idx) => (idx === i ? { ...t, minSeats: Math.max(1, Math.round(num(value))) } : t)));
  }
  function addTier() {
    const last = seatTiers[seatTiers.length - 1];
    setSeatTiers((ts) => [...ts, { minSeats: (last?.minSeats ?? 0) + 50, discount: Math.min(90, (last?.discount ?? 0) + 5) }]);
  }
  function removeTier(i) {
    if (i === 0) return; // the base tier (from seat 1) is not removable
    setSeatTiers((ts) => ts.filter((_, idx) => idx !== i));
  }

  const calc = useMemo(() => {
    const base = p.pluginPrices.reduce((a, b) => a + b, 0);
    const years = p.years;

    // Graduated seat factor. The first tier always covers from seat 1.
    const tiers = [...seatTiers].sort((a, b) => a.minSeats - b.minSeats);
    let seatFactor = 0;
    const bands = [];
    for (let k = 0; k < tiers.length; k++) {
      const lo = k === 0 ? 1 : tiers[k].minSeats;
      const hi = k + 1 < tiers.length ? tiers[k + 1].minSeats - 1 : Infinity;
      const count = Math.max(0, Math.min(p.nSeats, hi) - lo + 1);
      const rate = 1 - tiers[k].discount / 100;
      seatFactor += count * rate;
      if (count > 0) bands.push({ lo, hi, count, discount: tiers[k].discount, rate, subtotal: count * rate });
    }

    const termDiscount = (termDiscounts[years] ?? 0) / 100;
    const annual = base * seatFactor;
    const total = annual * years * (1 - termDiscount);

    // Linear baseline — every seat at full price, no term discount.
    const linearTotal = base * p.nSeats * years;
    const savingPct = linearTotal > 0 ? (1 - total / linearTotal) * 100 : 0;

    return { base, years, seatFactor, termDiscount, annual, total, linearTotal, savingPct, bands };
  }, [p, seatTiers, termDiscounts]);

  return (
    <main className="page">
      <header className="header">
        <div className="header-meta">License pricing · set-discount model</div>
        <h1 className="header-title">Pricing calculator</h1>
      </header>

      <div className="grid">
        {/* ─── Configuration ─────────────────────────────────── */}
        <div className="col-config">
          <Section label="Products" hint={`${(p.selectedPlugins ?? []).length} selected · linear`}>
            <div className="plugin-list">
              {plugins.map((pl, i) => {
                const selected = (p.selectedPlugins ?? []).includes(i);
                return (
                  <div
                    key={i}
                    className={`plugin-chip ${selected ? "active" : ""}`}
                    onClick={() => togglePlugin(i)}
                  >
                    <span className="plugin-chip-name">{pl.name}</span>
                    <span className="plugin-chip-price" onClick={(e) => e.stopPropagation()}>
                      <span className="plugin-chip-currency">$</span>
                      <input
                        className="plugin-chip-price-input"
                        type="number"
                        min="0"
                        step="1"
                        value={pl.price}
                        title="Edit price"
                        aria-label={`${pl.name} price per seat per year`}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => editPrice(i, e.target.value)}
                      />
                      <span className="plugin-chip-unit">/seat·yr</span>
                    </span>
                  </div>
                );
              })}

              {adding ? (
                <div className="plugin-add-form">
                  <input
                    className="plugin-add-name"
                    placeholder="Product or package name"
                    value={draft.name}
                    autoFocus
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addPlugin();
                      else if (e.key === "Escape") cancelAdd();
                    }}
                  />
                  <input
                    className="plugin-add-price"
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={draft.price}
                    onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addPlugin();
                      else if (e.key === "Escape") cancelAdd();
                    }}
                  />
                  <button type="button" className="plugin-add-confirm" onClick={addPlugin}>Add</button>
                  <button type="button" className="plugin-add-cancel" onClick={cancelAdd} aria-label="Cancel">×</button>
                </div>
              ) : (
                <button type="button" className="plugin-add-trigger" onClick={() => setAdding(true)}>
                  + Add product or package
                </button>
              )}
            </div>
          </Section>

          <Section label="Seats & duration">
            <div className="field">
              <div className="field-label">Seats</div>
              <Segmented
                ariaLabel="Seats"
                options={SEAT_OPTIONS.map((n) => ({ value: n, label: n }))}
                value={p.nSeats}
                onChange={update("nSeats")}
              />
            </div>
            <div className="field">
              <div className="field-label">License duration</div>
              <Segmented
                ariaLabel="License duration"
                options={DURATION_OPTIONS.map((d) => ({ value: d.years, label: d.label }))}
                value={p.years}
                onChange={update("years")}
              />
            </div>
          </Section>

          <Section label="Seat tiers" hint="graduated · deeper = cheaper">
            <div className="plugin-list">
              {seatTiers.map((t, i) => {
                const next = seatTiers[i + 1];
                const band = i === 0
                  ? (next ? `1–${next.minSeats - 1}` : "1+")
                  : (next ? `${t.minSeats}–${next.minSeats - 1}` : `${t.minSeats}+`);
                return (
                  <div className="plugin-chip" key={i}>
                    <span className="plugin-chip-name" style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
                      <input
                        className="plugin-chip-price-input"
                        style={{ width: 44, textAlign: "left" }}
                        type="number"
                        min="1"
                        step="1"
                        value={t.minSeats}
                        disabled={i === 0}
                        title={i === 0 ? "The base tier always starts at seat 1" : "Tier starts at this seat"}
                        aria-label={`Tier ${i + 1} starting seat`}
                        onChange={(e) => editTierThreshold(i, e.target.value)}
                      />
                      <span style={{ color: "var(--ink-3)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        seats {band}
                      </span>
                    </span>
                    <span className="plugin-chip-price" onClick={(e) => e.stopPropagation()}>
                      <input
                        className="plugin-chip-price-input"
                        type="number"
                        min="0"
                        max="99"
                        step="1"
                        value={t.discount}
                        aria-label={`Tier ${i + 1} discount percent`}
                        onChange={(e) => editTierDiscount(i, e.target.value)}
                      />
                      <span className="plugin-chip-unit">% off</span>
                      {i > 0 && (
                        <button type="button" className="plugin-add-cancel" onClick={() => removeTier(i)} aria-label="Remove tier">×</button>
                      )}
                    </span>
                  </div>
                );
              })}
              <button type="button" className="plugin-add-trigger" onClick={addTier}>
                + Add seat tier
              </button>
            </div>
          </Section>

          <Section label="Term discounts" hint="flat % per term">
            <div className="plugin-list">
              {DURATION_OPTIONS.map((d) => (
                <PctRow
                  key={d.years}
                  label={d.label}
                  value={termDiscounts[d.years] ?? 0}
                  onChange={(v) => setTermDiscounts((td) => ({ ...td, [d.years]: num(v) }))}
                />
              ))}
            </div>
          </Section>
        </div>

        {/* ─── Result ─────────────────────────────────── */}
        <aside className="col-result">
          <div className="result">
            <div className="result-label">Order total</div>
            <div className="result-total">
              <span className="currency">$</span>
              {calc.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="result-context">
              <span className="name">Set-discount</span> · {calc.years} yr · {p.nSeats} seats
            </div>

            <div className="result-row">
              <div className="result-row-label">Saving vs. linear</div>
              <div className="result-row-val">{calc.savingPct.toFixed(1)}%</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">Linear baseline</div>
              <div className="result-row-val">{money(calc.linearTotal)}</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">Effective seats <span className="small">graduated / {p.nSeats} nominal</span></div>
              <div className="result-row-val">{calc.seatFactor.toFixed(2)}</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">Term discount</div>
              <div className="result-row-val">{(calc.termDiscount * 100).toFixed(0)}%</div>
            </div>

            <Breakdown
              base={calc.base}
              seatFactor={calc.seatFactor}
              years={calc.years}
              termDiscount={calc.termDiscount}
              annual={calc.annual}
              total={calc.total}
            />
          </div>
        </aside>
      </div>

      {/* ─── Seat-tier graduation breakdown ─────────────────────────────────── */}
      <section className="models">
        <div className="models-header">
          <h2 className="models-title">Seat graduation</h2>
          <span className="models-sub">{p.nSeats} seats across the tiers</span>
        </div>

        <div className="baseline" style={{ display: "block", padding: 0, background: "transparent", border: "none" }}>
          <div className="brows">
            {calc.bands.map((b, i) => (
              <div className="brow" key={i}>
                <span className="brow-label">
                  seats {b.hi === Infinity ? `${b.lo}+` : `${b.lo}–${b.hi}`} · {b.count} × {(b.rate).toFixed(2)}
                  {b.discount > 0 ? ` (−${b.discount}%)` : ""}
                </span>
                <span className="brow-leader" />
                <span className="brow-val">{b.subtotal.toFixed(2)}</span>
              </div>
            ))}
            <div className="brow total">
              <span className="brow-label">Effective seats</span>
              <span className="brow-leader" />
              <span className="brow-val">{calc.seatFactor.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        Set discounts — products linear (bundle via package price), seats graduated, duration flat per term. Monotonic by construction.
      </footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
