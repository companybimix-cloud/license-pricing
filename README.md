# license-pricing

Internal calculator for the BIMix license pricing model. Static — open `index.html` (React + Babel
standalone, no build).

## Model — set discounts (not a formula)

Mirrors the backend `Commerce:Pricing` policy. Discounts are **set/tiered**, monotonic by
construction and explainable to a customer:

- **Products — linear.** The base is the sum of the named items' annual per-seat prices. There is no
  product-count discount; a multi-product discount is expressed by pricing a **package** below the
  sum of its members (a curated bundle SKU).
- **Seats — volume tiers over an open range.** Any count from 1 to 10,000 is sellable. The **whole**
  quantity is charged at the tier with the greatest `MinSeats ≤ seats` — not graduated — so 7 seats
  are all charged at the `3+` tier. Tiers: 1 / 3 / 10 / 30 / 100.
- **Duration — fixed terms.** A **closed** set (1 / 2 / 3 / 5 yr), each with its own flat multi-year
  discount. A term outside it is refused at checkout with `TermNotSellable`.

The seats/terms asymmetry is the thing to keep straight: seats are breakpoints in an open range,
terms are the entire list of what may be bought.

```
total = Σ(annual prices) × seats × (1 − seatDiscount) × years × (1 − termDiscount)
```

Every discount is editable — the seat tier the current count lands in, and the selected term — so the
launch numbers can be tuned. The **linear baseline** (no discounts) and the saving-vs-linear figure
show how much the discounts give away.

Totals are computed in **integer cents** and rounded once at the end, away from zero — matching
`OrderPricingService`, whose `AnnualPricePerSeatCents` is an integer column. The two agree to the
cent, which is the point of having a calculator at all.

> History: an earlier continuous power-law (δ) formula was retired — a count-based discount multiplied
> onto a heterogeneous price sum is non-monotonic (a superset order could cost less than its subset).
> It was replaced by graduated tiers, then briefly by five fixed seat *bundles*; the bundles were a
> mis-mirror — the backend has always tiered an open range — and priced 5 of the 10,000 sellable seat
> counts while silently refusing the rest. Prior calculators are preserved on the
> `snapshot/2026-07-07` and `snapshot/2026-07-23` branches.
