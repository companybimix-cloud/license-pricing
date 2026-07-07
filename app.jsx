const { useState, useMemo } = React;

const DAYS_PER_YEAR = 365;

const RANGES = {
  discount: { min: 0.0, max: 0.5, step: 0.01 },  // δ — discount strength per axis
};

const BLEND_WEIGHT = 0.5;

// Fixed, selectable tiers.
const SEAT_OPTIONS = [1, 3, 10, 30, 100];
const DURATION_OPTIONS = [
  { label: "1 yr", days: 1 * DAYS_PER_YEAR },
  { label: "2 yr", days: 2 * DAYS_PER_YEAR },
  { label: "3 yr", days: 3 * DAYS_PER_YEAR },
  { label: "5 yr", days: 5 * DAYS_PER_YEAR },
];

const DEFAULT = {
  nPlugins: 5,
  selectedPlugins: [0, 1, 2, 3, 4],
  pluginPrices: [50, 50, 50, 50, 50],
  nSeats: 10,
  durationDays: 1 * DAYS_PER_YEAR,
  dPlugins: 0.05,   // δₚ — bulk discount on product axis (0 = none)
  dSeats:   0.05,   // δₛ — bulk discount on seat axis
  dMonths:  0.02,   // δₘ — bulk discount on duration axis
};

// Initial products — all editable, all $50.
const pluginList = [
  { name: "ARCH Standard",  price: 50 },
  { name: "MECH Standard",  price: 50 },
  { name: "ELEC Standard",  price: 50 },
  { name: "STRUC Standard", price: 50 },
  { name: "BIM Standard",   price: 50 },
];

const MODEL_TAGLINE = {
  power:    "Compounding bulk discount across every axis.",
  marginal: "Each additional unit costs slightly less than the last.",
  blend:    "Half linear, half power-law — a safety floor.",
};

const num = (v) => parseFloat(v) || 0;

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

function SliderRow({ label, value, min, max, step, onChange, format, hint, meta }) {
  return (
    <div className="slider-row">
      <div className="slider-line">
        <span className="slider-name">{label}</span>
        <span className="slider-right">
          <span className="slider-readout">{format ? format(value) : value}</span>
          {meta && <span className="slider-meta">· {meta}</span>}
        </span>
      </div>
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
      {hint && <div className="slider-hint">{hint}</div>}
    </div>
  );
}

function FormulaBreakdown({ base, model }) {
  const fmt = (n) => n.toFixed(4);
  const money = (n) => "$" + n.toFixed(2);

  return (
    <div className="breakdown">
      <div className="breakdown-label">Breakdown</div>
      <div className="breakdown-formula">{model.formula}</div>
      <div className="brows">
        <div className="brow">
          <span className="brow-label">Base bundle (Σ product prices /yr)</span>
          <span className="brow-leader" />
          <span className="brow-val">{money(base)}</span>
        </div>
        {model.multipliers.map((m, i) => (
          <div className="brow" key={i}>
            <span className="brow-label">× {m.label}</span>
            <span className="brow-leader" />
            <span className="brow-val">{fmt(m.value)}</span>
          </div>
        ))}
        <div className="brow total">
          <span className="brow-label">Total</span>
          <span className="brow-leader" />
          <span className="brow-val">{money(model.total)}</span>
        </div>
      </div>
    </div>
  );
}

function ModelCard({ model, linearTotal, isActive, onClick }) {
  const off = linearTotal > 0 ? ((1 - model.total / linearTotal) * 100).toFixed(1) : "0.0";
  const money = (n) => "$" + n.toFixed(2);

  return (
    <article className={`model-card ${isActive ? "active" : ""}`} onClick={onClick}>
      {isActive && <span className="model-active-tag">Selected</span>}
      <div className="model-name">{model.name.split(" (")[0]}</div>
      <div className="model-tagline">{MODEL_TAGLINE[model.key]}</div>
      <div className="model-price">{money(model.total)}</div>
      <div className="model-vs">−{off}% vs. linear</div>
      <p className="model-desc">{model.description}</p>
      <div className="model-callouts">
        <div className="callout good">
          <span className="callout-tag">For</span>
          <span className="callout-text">{model.good}</span>
        </div>
        <div className="callout risk">
          <span className="callout-tag">Catch</span>
          <span className="callout-text">{model.risk}</span>
        </div>
      </div>
      <div className="model-formula">{model.formula}</div>
    </article>
  );
}

function App() {
  const [p, setP] = useState(DEFAULT);
  const [modelKey, setModelKey] = useState("power");
  const [plugins, setPlugins] = useState(pluginList);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", price: "" });

  const update = (key) => (val) => setP((prev) => ({ ...prev, [key]: val }));

  // Recompute the active price bundle from a product list + selection.
  const pricesFor = (list, selected) => selected.map((idx) => num(list[idx].price));

  function togglePlugin(i) {
    const current = p.selectedPlugins ?? [];
    const next = current.includes(i)
      ? current.filter((x) => x !== i)
      : [...current, i];
    setP((prev) => ({
      ...prev,
      selectedPlugins: next,
      nPlugins: next.length,
      pluginPrices: pricesFor(plugins, next),
    }));
  }

  function editPrice(i, value) {
    const next = plugins.map((pl, idx) => (idx === i ? { ...pl, price: value } : pl));
    setPlugins(next);
    setP((prev) => ({
      ...prev,
      pluginPrices: pricesFor(next, prev.selectedPlugins ?? []),
    }));
  }

  function addPlugin() {
    const name = draft.name.trim();
    const price = parseFloat(draft.price);
    if (!name || !(price > 0)) return;
    const newIdx = plugins.length;
    const nextPlugins = [...plugins, { name, price }];
    const next = [...(p.selectedPlugins ?? []), newIdx];
    setPlugins(nextPlugins);
    setP((prev) => ({
      ...prev,
      selectedPlugins: next,
      nPlugins: next.length,
      pluginPrices: pricesFor(nextPlugins, next),
    }));
    setDraft({ name: "", price: "" });
    setAdding(false);
  }

  function cancelAdd() {
    setDraft({ name: "", price: "" });
    setAdding(false);
  }

  const calc = useMemo(() => {
    const base = p.pluginPrices.reduce((a, b) => a + b, 0);
    const years = p.durationDays / DAYS_PER_YEAR;
    const hasPlugins = p.nPlugins > 0;

    // Discount strength → effective exponent on each axis.
    // (Products are already summed in Base, so they only get a -δ "extra" exponent;
    //  seats and years enter linearly, so their exponent is 1-δ.)
    const expPlugins = -p.dPlugins;       // Nₚ^(−δₚ)
    const expSeats   = 1 - p.dSeats;      // Nₛ^(1−δₛ)
    const expMonths  = 1 - p.dMonths;     // M^(1−δₘ)

    // When N_p = 0, base is 0 anyway, but Math.pow(0, negative) = Infinity would poison
    // the products into NaN. Short-circuit the product factor to 1 in that case.
    const powPlugins = hasPlugins ? Math.pow(p.nPlugins, expPlugins) : 1;

    // Model A — Power (multiplicative)
    const fPlugins = powPlugins;
    const gSeats   = Math.pow(p.nSeats, expSeats);
    const hDuration = Math.pow(years,  expMonths);
    const total = base * fPlugins * gSeats * hDuration;

    // Linear baseline (all δ = 0 ⇒ Total = base × Nₛ × M)
    const linearTotal = base * p.nSeats * years;

    const sumPow = (N, exp) => {
      let s = 0;
      for (let i = 1; i <= N; i++) s += Math.pow(i, exp);
      return s;
    };

    // Model B — Marginal tiered
    const seatsMarg = sumPow(p.nSeats, -p.dSeats);                                      // Σ i^(−δₛ)
    const yearsMarg = sumPow(years, -p.dMonths);                                        // Σ i^(−δₘ)
    const pluginsMarg = hasPlugins ? sumPow(p.nPlugins, expPlugins) / p.nPlugins : 1;   // (Σ i^(−δₚ))/Nₚ
    const totalMarginal = base * pluginsMarg * seatsMarg * yearsMarg;

    // Model C — Linear-power blend
    const W = BLEND_WEIGHT;
    const seatsBlend   = W * p.nSeats + (1 - W) * Math.pow(p.nSeats, expSeats);
    const yearsBlend   = W * years    + (1 - W) * Math.pow(years,    expMonths);
    const pluginsBlend = W + (1 - W) * powPlugins;
    const totalBlend = base * pluginsBlend * seatsBlend * yearsBlend;

    const models = {
      power: {
        key: "power",
        name: "Power (multiplicative)",
        formula: "Base × Nₚ^(−δₚ) × Nₛ^(1−δₛ) × M^(1−δₘ)",
        total,
        multipliers: [
          { label: "f(products) = Nₚ^(−δₚ)", value: fPlugins },
          { label: "g(seats) = Nₛ^(1−δₛ)", value: gSeats },
          { label: "h(years) = M^(1−δₘ)", value: hDuration },
        ],
        description: "Each lever — products, seats, and license length — has its own bulk discount, and the discounts multiply together. A customer who grows on every axis at once gets a deeply compounded deal.",
        good: "Rewards customers who buy the full package. Marketing-friendly headline savings.",
        risk: "Aggressive tuning can let a big multi-axis order undercut a smaller single-axis one.",
      },
      marginal: {
        key: "marginal",
        name: "Marginal tiered",
        formula: "Base × avgₚ × Σ i^(−δₛ) × Σ i^(−δₘ)",
        total: totalMarginal,
        multipliers: [
          { label: "products avg = (Σ i^(−δₚ))/Nₚ", value: pluginsMarg },
          { label: "seats = Σ i^(−δₛ)", value: seatsMarg },
          { label: "years = Σ i^(−δₘ)", value: yearsMarg },
        ],
        description: "Like a punch card. Each next unit costs a bit less than the one before. Total = sum of per-unit prices, not a flat multiplier.",
        good: "A bigger order always costs more than a smaller one. Easy to defend in a sales conversation.",
        risk: "Discounts feel less dramatic at scale. Headline savings shrink.",
      },
      blend: {
        key: "blend",
        name: "Linear-power blend",
        formula: "Base × ½(1 + Nₚ^(−δₚ)) × ½(Nₛ + Nₛ^(1−δₛ)) × ½(M + M^(1−δₘ))",
        total: totalBlend,
        multipliers: [
          { label: "products = ½(1 + Nₚ^(−δₚ))", value: pluginsBlend },
          { label: "seats = ½(Nₛ + Nₛ^(1−δₛ))", value: seatsBlend },
          { label: "years = ½(M + M^(1−δₘ))", value: yearsBlend },
        ],
        description: "Splits every price in half. One half scales straight per-unit. The other half gets the full power-law discount. Linear half acts as a safety floor.",
        good: "Most conservative. More units always cost more — zero pricing surprises.",
        risk: "Smaller savings for large customers — discount only applies to half the price.",
      },
    };

    return {
      base, years, linearTotal,
      fPlugins, gSeats, hDuration, total, totalMarginal, totalBlend,
      models,
    };
  }, [p]);

  const activeModel = calc.models[modelKey];
  const savingPct = calc.linearTotal > 0
    ? ((1 - activeModel.total / calc.linearTotal) * 100)
    : 0;
  const durationYears = p.durationDays / DAYS_PER_YEAR;

  return (
    <main className="page">

      <header className="header">
        <div className="header-meta">License pricing · internal tool</div>
        <h1 className="header-title">Pricing calculator</h1>
      </header>

      <div className="grid">

        {/* ─── Configuration ─────────────────────────────────── */}
        <div className="col-config">

          <Section label="Products" hint={`${p.nPlugins} selected`}>
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
                    <span
                      className="plugin-chip-price"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="plugin-chip-currency">$</span>
                      <input
                        className="plugin-chip-price-input"
                        type="number"
                        min="0"
                        step="1"
                        value={pl.price}
                        title="Edit price"
                        aria-label={`${pl.name} price per year`}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => editPrice(i, e.target.value)}
                      />
                      <span className="plugin-chip-unit">/yr</span>
                    </span>
                  </div>
                );
              })}

              {adding ? (
                <div className="plugin-add-form">
                  <input
                    className="plugin-add-name"
                    placeholder="Product name"
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
                  + Add product
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
                options={DURATION_OPTIONS.map((d) => ({ value: d.days, label: d.label }))}
                value={p.durationDays}
                onChange={update("durationDays")}
              />
            </div>
          </Section>

          <Section label="Bulk discount per axis" hint="0% = linear, higher = steeper discount">
            <SliderRow
              label="δₚ  Products"
              value={p.dPlugins}
              {...RANGES.discount}
              onChange={update("dPlugins")}
              format={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <SliderRow
              label="δₛ  Seats"
              value={p.dSeats}
              {...RANGES.discount}
              onChange={update("dSeats")}
              format={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <SliderRow
              label="δₘ  Duration"
              value={p.dMonths}
              {...RANGES.discount}
              onChange={update("dMonths")}
              format={(v) => `${(v * 100).toFixed(0)}%`}
            />
          </Section>
        </div>

        {/* ─── Result ─────────────────────────────────── */}
        <aside className="col-result">
          <div className="result">

            <div className="result-tabs">
              {Object.values(calc.models).map((m) => (
                <button
                  key={m.key}
                  className={`result-tab ${modelKey === m.key ? "active" : ""}`}
                  onClick={() => setModelKey(m.key)}
                >
                  {m.key}
                </button>
              ))}
            </div>

            <div className="result-label">Publisher total</div>
            <div className="result-total">
              <span className="currency">$</span>{activeModel.total.toFixed(2)}
            </div>
            <div className="result-context">
              <span className="name">{activeModel.name}</span> · {durationYears} yr · {p.nSeats} seats
            </div>

            <div className="result-row">
              <div className="result-row-label">Saving vs. linear</div>
              <div className="result-row-val">{savingPct.toFixed(1)}%</div>
            </div>

            <div className="result-row">
              <div className="result-row-label">Linear baseline</div>
              <div className="result-row-val">${calc.linearTotal.toFixed(2)}</div>
            </div>

            <FormulaBreakdown
              base={calc.base}
              model={activeModel}
            />
          </div>
        </aside>
      </div>

      {/* ─── Pricing models ─────────────────────────────────── */}
      <section className="models">
        <div className="models-header">
          <h2 className="models-title">Pricing models</h2>
          <span className="models-sub">Click to apply</span>
        </div>

        <div className="models-grid">
          {Object.values(calc.models).map((m) => (
            <ModelCard
              key={m.key}
              model={m}
              linearTotal={calc.linearTotal}
              isActive={modelKey === m.key}
              onClick={() => setModelKey(m.key)}
            />
          ))}
        </div>

        <div className="baseline">
          <span className="baseline-tag">Baseline</span>
          <span className="baseline-name">Linear (no discount)</span>
          <span className="baseline-formula">base × seats × years</span>
          <span className="baseline-total">${calc.linearTotal.toFixed(2)}</span>
        </div>
      </section>

    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
