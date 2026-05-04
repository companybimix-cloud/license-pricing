const { useState, useMemo } = React;

const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

const RANGES = {
  seats:      { min: 1,   max: 50,   step: 1 },
  duration:   { min: 30,  max: 1095, step: 1 },
  discount:   { min: 0.0, max: 0.5,  step: 0.01 },  // δ — discount strength per axis
  loyalty:    { min: 0,   max: 0.5,  step: 0.01 },
  integrator: { min: 0,   max: 1.0,  step: 0.01 },
};

const BLEND_WEIGHT = 0.5;

const REGIONS = [
  { id: "us-ca",       name: "US & Canada",      multiplier: 1.00 },
  { id: "eu",          name: "Europe",           multiplier: 0.97 },
  { id: "apac",        name: "Asia-Pacific",     multiplier: 0.94 },
  { id: "latam",       name: "Latin America",    multiplier: 0.92 },
  { id: "mena-africa", name: "MENA & Africa",    multiplier: 0.90 },
];

const DEFAULT = {
  pluginPrices: [25, 10, 12],
  nPlugins: 3,
  nSeats: 10,
  durationDays: 365,
  dPlugins: 0.05,   // δₚ — bulk discount on plugin axis (0 = none)
  dSeats:   0.05,   // δₛ — bulk discount on seat axis
  dMonths:  0.02,   // δₘ — bulk discount on duration axis
  loyaltyDiscount: 0.15,
  isExisting: false,
  regionId: "us-ca",
  integratorMarkup: 0.20,
};

const pluginList = [
  { name: "MECHix Standard", price: 25 },
  { name: "MEP Opening", price: 10 },
  { name: "Brand Integrator", price: 12 },
  { name: "Exporter", price: 12 },
  { name: "Translator", price: 14 },
];

const MODEL_TAGLINE = {
  power:    "Compounding bulk discount across every axis.",
  marginal: "Each additional unit costs slightly less than the last.",
  blend:    "Half linear, half power-law — a safety floor.",
};

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

function FormulaBreakdown({ base, model, loyalty, isExisting }) {
  const fmt = (n) => n.toFixed(4);
  const money = (n) => "$" + n.toFixed(2);

  return (
    <div className="breakdown">
      <div className="breakdown-label">Breakdown</div>
      <div className="breakdown-formula">{model.formula}{isExisting ? " × loyalty" : ""}</div>
      <div className="brows">
        <div className="brow">
          <span className="brow-label">Base bundle (Σ plugin prices /mo)</span>
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
        {isExisting && (
          <div className="brow">
            <span className="brow-label">× Loyalty multiplier</span>
            <span className="brow-leader" />
            <span className="brow-val">{fmt(loyalty)}</span>
          </div>
        )}
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

  function addPlugin() {
    const name = draft.name.trim();
    const price = parseFloat(draft.price);
    if (!name || !(price > 0)) return;
    const newIdx = plugins.length;
    const nextPlugins = [...plugins, { name, price }];
    const current = p.selectedPlugins ?? Array.from({ length: p.nPlugins }, (_, j) => j);
    const next = [...current, newIdx];
    setPlugins(nextPlugins);
    setP(prev => ({
      ...prev,
      selectedPlugins: next,
      nPlugins: next.length,
      pluginPrices: next.map(idx => nextPlugins[idx].price),
    }));
    setDraft({ name: "", price: "" });
    setAdding(false);
  }

  function cancelAdd() {
    setDraft({ name: "", price: "" });
    setAdding(false);
  }

  const calc = useMemo(() => {
    const region = REGIONS.find(r => r.id === p.regionId) ?? REGIONS[0];
    const baseRaw = p.pluginPrices.reduce((a, b) => a + b, 0);
    const base = baseRaw * region.multiplier;
    const months = p.durationDays / DAYS_PER_MONTH;
    const loyalty = p.isExisting ? 1 - p.loyaltyDiscount : 1;
    const hasPlugins = p.nPlugins > 0;

    // Discount strength → effective exponent on each axis.
    // (Plugins are already summed in Base, so they only get a -δ "extra" exponent;
    //  seats and months enter linearly, so their exponent is 1-δ.)
    const expPlugins = -p.dPlugins;       // Nₚ^(−δₚ)
    const expSeats   = 1 - p.dSeats;      // Nₛ^(1−δₛ)
    const expMonths  = 1 - p.dMonths;     // M^(1−δₘ)

    // When N_p = 0, base is 0 anyway, but Math.pow(0, negative) = Infinity would poison
    // the products into NaN. Short-circuit the plugin factor to 1 in that case.
    const powPlugins = hasPlugins ? Math.pow(p.nPlugins, expPlugins) : 1;

    // Model A — Power (multiplicative)
    const fPlugins = powPlugins;
    const gSeats   = Math.pow(p.nSeats, expSeats);
    const hDuration = Math.pow(months,  expMonths);
    const total = base * fPlugins * gSeats * hDuration * loyalty;

    // Linear baseline (all δ = 0 ⇒ Total = base × Nₛ × M)
    const linearTotal = base * p.nSeats * months;

    const sumPow = (N, exp) => {
      let s = 0;
      for (let i = 1; i <= N; i++) s += Math.pow(i, exp);
      return s;
    };

    // Model B — Marginal tiered
    const seatsMarg = sumPow(p.nSeats, -p.dSeats);                                      // Σ i^(−δₛ)
    const monthsMarg = expMonths > 0 ? Math.pow(months, expMonths) / expMonths : months;
    const pluginsMarg = hasPlugins ? sumPow(p.nPlugins, expPlugins) / p.nPlugins : 1;   // (Σ i^(−δₚ))/Nₚ
    const totalMarginal = base * pluginsMarg * seatsMarg * monthsMarg * loyalty;

    // Model C — Linear-power blend
    const W = BLEND_WEIGHT;
    const seatsBlend   = W * p.nSeats + (1 - W) * Math.pow(p.nSeats, expSeats);
    const monthsBlend  = W * months   + (1 - W) * Math.pow(months,   expMonths);
    const pluginsBlend = W + (1 - W) * powPlugins;
    const totalBlend = base * pluginsBlend * seatsBlend * monthsBlend * loyalty;

    const models = {
      power: {
        key: "power",
        name: "Power (multiplicative)",
        formula: "Base × Nₚ^(−δₚ) × Nₛ^(1−δₛ) × M^(1−δₘ)",
        total,
        multipliers: [
          { label: "f(plugins) = Nₚ^(−δₚ)", value: fPlugins },
          { label: "g(seats) = Nₛ^(1−δₛ)", value: gSeats },
          { label: "h(months) = M^(1−δₘ)", value: hDuration },
        ],
        description: "Each lever — plugins, seats, and license length — has its own bulk discount, and the discounts multiply together. A customer who grows on every axis at once gets a deeply compounded deal.",
        good: "Rewards customers who buy the full package. Marketing-friendly headline savings.",
        risk: "Aggressive tuning can let a big multi-axis order undercut a smaller single-axis one.",
      },
      marginal: {
        key: "marginal",
        name: "Marginal tiered",
        formula: "Base × avgₚ × Σ i^(−δₛ) × M^(1−δₘ) ⁄ (1−δₘ)",
        total: totalMarginal,
        multipliers: [
          { label: "plugins avg = (Σ i^(−δₚ))/Nₚ", value: pluginsMarg },
          { label: "seats = Σ i^(−δₛ)", value: seatsMarg },
          { label: "months = M^(1−δₘ) ⁄ (1−δₘ)", value: monthsMarg },
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
          { label: "plugins = ½(1 + Nₚ^(−δₚ))", value: pluginsBlend },
          { label: "seats = ½(Nₛ + Nₛ^(1−δₛ))", value: seatsBlend },
          { label: "months = ½(M + M^(1−δₘ))", value: monthsBlend },
        ],
        description: "Splits every price in half. One half scales straight per-unit. The other half gets the full power-law discount. Linear half acts as a safety floor.",
        good: "Most conservative. More units always cost more — zero pricing surprises.",
        risk: "Smaller savings for large customers — discount only applies to half the price.",
      },
    };

    return {
      base, baseRaw, region, months, loyalty, linearTotal,
      fPlugins, gSeats, hDuration, total, totalMarginal, totalBlend,
      integratorMarkup: p.integratorMarkup,
      models,
    };
  }, [p]);

  const activeModel = calc.models[modelKey];
  const savingPct = calc.linearTotal > 0
    ? ((1 - activeModel.total / calc.linearTotal) * 100)
    : 0;
  const customerTotal = activeModel.total * (1 + calc.integratorMarkup);

  return (
    <main className="page">

      <header className="header">
        <div className="header-meta">License pricing · sandbox</div>
        <h1 className="header-title">Tune the formula, watch the total move.</h1>
        <p className="header-sub">Pick plugins, set seats, term, and discount exponents — three pricing models recompute live.</p>
      </header>

      <div className="grid">

        {/* ─── Configuration ─────────────────────────────────── */}
        <div className="col-config">

          <Section label="Region">
            <div className="region-list">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`region-option ${p.regionId === r.id ? "active" : ""}`}
                  onClick={() => setP(prev => ({ ...prev, regionId: r.id }))}
                >
                  <span className="region-option-name">{r.name}</span>
                  <span className="region-option-rate">×{r.multiplier.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section label="Plugins" hint={`${p.nPlugins} selected`}>
            <div className="plugin-list">
              {plugins.map((pl, i) => {
                const selected = p.selectedPlugins
                  ? p.selectedPlugins.includes(i)
                  : i < p.nPlugins;
                return (
                  <div
                    key={i}
                    className={`plugin-chip ${selected ? "active" : ""}`}
                    onClick={() => {
                      const current = p.selectedPlugins ?? Array.from({ length: p.nPlugins }, (_, j) => j);
                      const next = current.includes(i)
                        ? current.filter(x => x !== i)
                        : [...current, i];
                      const prices = next.map(idx => plugins[idx].price);
                      setP(prev => ({
                        ...prev,
                        selectedPlugins: next,
                        nPlugins: next.length,
                        pluginPrices: prices,
                      }));
                    }}
                  >
                    <span className="plugin-chip-name">{pl.name}</span>
                    <span className="plugin-chip-price">${pl.price}/mo</span>
                  </div>
                );
              })}

              {adding ? (
                <div className="plugin-add-form">
                  <input
                    className="plugin-add-name"
                    placeholder="Plugin name"
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
                  + Add plugin
                </button>
              )}
            </div>
          </Section>

          <Section label="Seats and duration">
            <SliderRow
              label="Seats"
              value={p.nSeats}
              {...RANGES.seats}
              onChange={update("nSeats")}
            />
            <SliderRow
              label="License duration"
              value={p.durationDays}
              {...RANGES.duration}
              onChange={update("durationDays")}
              format={(v) => v >= DAYS_PER_YEAR ? `${(v / DAYS_PER_YEAR).toFixed(1)} yr` : `${v} d`}
            />
          </Section>

          <Section label="Bulk discount per axis" hint="0% = linear, higher = steeper discount">
            <SliderRow
              label="δₚ  Plugins"
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

          <Section label="Adjustments">

            <div className="adj-group">
              <div className="adj-group-label">Loyalty</div>
              <SliderRow
                label="Discount rate"
                value={p.loyaltyDiscount}
                {...RANGES.loyalty}
                onChange={update("loyaltyDiscount")}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                hint="Applied only if customer already holds a license"
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

            <div className="adj-group">
              <div className="adj-group-label">Integrator</div>
              <SliderRow
                label="Reseller markup"
                value={p.integratorMarkup}
                {...RANGES.integrator}
                onChange={update("integratorMarkup")}
                format={(v) => `+${(v * 100).toFixed(0)}%`}
                hint="Surcharge above publisher price"
              />
            </div>

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
              <span className="name">{activeModel.name}</span> · {calc.region.name} · {calc.months.toFixed(1)} mo · {p.nSeats} seats
            </div>

            <div className="result-row customer">
              <div className="result-row-label">
                Customer pays
                <span className="small">+{(calc.integratorMarkup * 100).toFixed(0)}% integrator</span>
              </div>
              <div className="result-row-val">${customerTotal.toFixed(2)}</div>
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
              loyalty={calc.loyalty}
              isExisting={p.isExisting}
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
          <span className="baseline-formula">base × seats × months</span>
          <span className="baseline-total">${calc.linearTotal.toFixed(2)}</span>
        </div>
      </section>

    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
