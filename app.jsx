const { useState } = React;

// Fixed, sellable bundles. Each option carries its own flat discount (no graduated tiers) —
// mirrors the backend Commerce:Pricing model: a per-bundle seat discount and a per-term discount.
const SEAT_OPTIONS = [1, 5, 10, 30, 100];
const TERM_OPTIONS = [1, 2, 3, 5];
const DEFAULT_SEAT_DISC = { 1: 0, 5: 5, 10: 10, 30: 15, 100: 20 };
const DEFAULT_TERM_DISC = { 1: 0, 2: 10, 3: 15, 5: 20 };

// Products are LINEAR: base = Σ of the named items' annual per-seat prices. A multi-product
// discount is expressed by pricing a PACKAGE below the sum of its members (a curated bundle SKU).
const INITIAL_PRODUCTS = [
  { name: "ARCH Standard",  price: 50, on: true },
  { name: "MECH Standard",  price: 50, on: true },
  { name: "ELEC Standard",  price: 50, on: true },
  { name: "STRUC Standard", price: 50, on: true },
  { name: "BIM Standard",   price: 50, on: true },
];

const num = (v) => parseFloat(v) || 0;
const money = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clampPct = (v) => Math.min(95, Math.max(0, Math.round(num(v))));

function Stepper({ value, onChange }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label="Decrease">–</button>
      <input className="mono" type="number" min="0" max="95" value={value}
        onChange={(e) => onChange(clampPct(e.target.value))} aria-label="Discount percent" />
      <button type="button" onClick={() => onChange(Math.min(95, value + 1))} aria-label="Increase">+</button>
    </div>
  );
}

// A fixed set of options, each carrying a flat discount shown on the chip. Used for seats + terms.
function OptionGroup({ variant, title, hint, options, discounts, selected, onSelect, onDiscount, unit }) {
  const disc = discounts[selected] || 0;
  return (
    <section className="sec">
      <div className="sec-h"><span className="t">{title}</span><span className="hint">{hint}</span></div>
      <div className={`opts ${variant}`}>
        {options.map((v) => {
          const d = discounts[v] || 0;
          return (
            <div key={v} className={`opt ${selected === v ? "on" : ""}`} onClick={() => onSelect(v)}>
              <div className="big">{v}</div>
              <div className="unit">{unit(v)}</div>
              <div className={`pct ${d === 0 ? "zero" : ""}`}>{d === 0 ? "full price" : `−${d}%`}</div>
            </div>
          );
        })}
      </div>
      <div className="opt-edit">
        <span className="lab"><b>{selected}</b> {unit(selected)} · discount</span>
        <Stepper value={disc} onChange={(v) => onDiscount(selected, v)} />
      </div>
    </section>
  );
}

function App() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [seats, setSeats] = useState(30);
  const [years, setYears] = useState(3);
  const [seatDisc, setSeatDisc] = useState(DEFAULT_SEAT_DISC);
  const [termDisc, setTermDisc] = useState(DEFAULT_TERM_DISC);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", price: "" });

  const base = products.reduce((a, p) => a + (p.on ? num(p.price) : 0), 0);
  const sd = (seatDisc[seats] || 0) / 100;
  const td = (termDisc[years] || 0) / 100;
  const annual = base * seats * (1 - sd);
  const total = annual * years * (1 - td);
  const linear = base * seats * years;
  const saving = linear > 0 ? (1 - total / linear) * 100 : 0;
  const selectedCount = products.filter((p) => p.on).length;

  const toggleProduct = (i) => setProducts((ps) => ps.map((p, idx) => (idx === i ? { ...p, on: !p.on } : p)));
  const editProductPrice = (i, v) => setProducts((ps) => ps.map((p, idx) => (idx === i ? { ...p, price: v } : p)));
  const cancelAdd = () => { setAdding(false); setDraft({ name: "", price: "" }); };
  const addProduct = () => {
    const name = draft.name.trim();
    const price = parseFloat(draft.price);
    if (!name || !(price > 0)) return;
    setProducts((ps) => [...ps, { name, price, on: true }]);
    cancelAdd();
  };
  const addKey = (e) => { if (e.key === "Enter") addProduct(); else if (e.key === "Escape") cancelAdd(); };

  return (
    <main className="wrap">
      <header className="head">
        <div className="kicker">License pricing · set-discount model</div>
        <h1>Pricing calculator</h1>
        <div className="note">Seats and duration are each a fixed set of options, and every option carries its own flat discount right on the chip. Products are linear — bundle by pricing a package below its members.</div>
      </header>

      <div className="grid">
        <div className="config">
          <section className="sec">
            <div className="sec-h"><span className="t">Products</span><span className="hint">{selectedCount} selected · linear</span></div>
            <div className="prod-list">
              {products.map((p, i) => (
                <div key={i} className={`prod ${p.on ? "on" : ""}`} onClick={() => toggleProduct(i)}>
                  <span className="nm">{p.name}</span>
                  <span className="pr" onClick={(e) => e.stopPropagation()}>
                    <span className="cur">$</span>
                    <input className="pin" type="number" min="0" step="1" value={p.price}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => editProductPrice(i, e.target.value)}
                      aria-label={`${p.name} price per seat per year`} />
                    <span className="un">/seat·yr</span>
                  </span>
                </div>
              ))}
              {adding ? (
                <div className="prod-add">
                  <input className="nm" placeholder="Product or package name" autoFocus
                    value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={addKey} />
                  <input className="pr" type="number" placeholder="0.00" min="0" step="0.01"
                    value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} onKeyDown={addKey} />
                  <button type="button" className="ok" onClick={addProduct}>Add</button>
                  <button type="button" className="x" onClick={cancelAdd} aria-label="Cancel">×</button>
                </div>
              ) : (
                <button type="button" className="add" onClick={() => setAdding(true)}>+ Add product or package</button>
              )}
            </div>
            <div className="base-line"><span>Base bundle · per seat · year</span><b>{money(base)}</b></div>
          </section>

          <OptionGroup variant="seats" title="Seats" hint="volume discount per bundle"
            options={SEAT_OPTIONS} discounts={seatDisc} selected={seats}
            onSelect={setSeats} onDiscount={(k, v) => setSeatDisc((d) => ({ ...d, [k]: v }))}
            unit={(v) => (v === 1 ? "seat" : "seats")} />

          <OptionGroup variant="terms" title="Duration" hint="discount per term"
            options={TERM_OPTIONS} discounts={termDisc} selected={years}
            onSelect={setYears} onDiscount={(k, v) => setTermDisc((d) => ({ ...d, [k]: v }))}
            unit={(v) => (v === 1 ? "year" : "years")} />
        </div>

        <aside>
          <div className="result">
            <div className="rl">Order total</div>
            <div className="total"><span className="cur">$</span>{money0(total)}</div>
            <div className="ctx">{years} yr · {seats} seats · {selectedCount} products</div>

            <div className="row save"><span className="k">Saving vs. linear</span><span className="v">{saving.toFixed(1)}%</span></div>
            <div className="row"><span className="k">Linear baseline</span><span className="v">{money(linear)}</span></div>
            <div className="row"><span className="k">Seat discount</span><span className="v">{(sd * 100).toFixed(0)}%</span></div>
            <div className="row"><span className="k">Term discount</span><span className="v">{(td * 100).toFixed(0)}%</span></div>

            <div className="bd">
              <div className="bl">Breakdown</div>
              <div className="f">base × seats × (1 − seat disc.) × years × (1 − term disc.)</div>
              <div className="bdrow"><span className="bk">Base bundle</span><span className="ld" /><span className="bv">{money(base)}</span></div>
              <div className="bdrow"><span className="bk">× seats</span><span className="ld" /><span className="bv">{seats}</span></div>
              <div className="bdrow"><span className="bk">× (1 − seat disc.){sd > 0 && <span className="m">−{(sd * 100).toFixed(0)}%</span>}</span><span className="ld" /><span className="bv">{(1 - sd).toFixed(2)}</span></div>
              <div className="bdrow"><span className="bk">= annual</span><span className="ld" /><span className="bv">{money(annual)}</span></div>
              <div className="bdrow"><span className="bk">× years</span><span className="ld" /><span className="bv">{years}</span></div>
              <div className="bdrow"><span className="bk">× (1 − term disc.){td > 0 && <span className="m">−{(td * 100).toFixed(0)}%</span>}</span><span className="ld" /><span className="bv">{(1 - td).toFixed(2)}</span></div>
              <div className="bdrow tot"><span className="bk">Total</span><span className="ld" /><span className="bv">{money(total)}</span></div>
            </div>
          </div>
        </aside>
      </div>

      <div className="foot">Set discounts · fixed seat &amp; term bundles, a flat discount each. Products linear (bundle via package price).</div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
