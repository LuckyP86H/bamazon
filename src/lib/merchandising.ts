/**
 * The merchandising panel: restock urgency, a deal-of-the-day proposal and a
 * purchase-order draft, all judged.
 *
 * The signals are plain arithmetic over data the store already keeps — stock on
 * hand, units sold in the last 30 days, days of cover at that rate, revenue —
 * and the reasons shown next to every score are generated from those signals, so
 * a manager can always see WHY. The judge (Jev when configured, the labelled
 * demo judge otherwise) turns the signals into a calibrated urgency score and
 * gates the two proposed actions. The judge never writes anything: featuring a
 * deal and applying a restock are manager clicks through the existing handlers.
 */
import { listProducts, productSalesStats, type Db, type ProductRow, type SalesStats } from "./db";
import { judgeWithFallback, type JudgeEnv, type JudgeQuestion } from "./judge";
import { formatUsd } from "./money";
import { LOW_STOCK } from "./stock";

type FetchFn = typeof fetch;

export interface ProductSignals {
  product: ProductRow;
  unitsRecent: number;
  revenueRecentCents: number;
  /** Days the current stock lasts at the recent sales rate. Null: no recent sales. */
  daysOfCover: number | null;
  /** Deterministic urgency, 0..1. Also the signal the demo judge reads. */
  urgency: number;
  reasons: string[];
}

interface ScoredProduct {
  signals: ProductSignals;
  /** Urgency on a 0–100 scale, as judged. */
  score: number;
  confidence: number;
}

interface GateDecision {
  product: ProductRow;
  approved: boolean;
  /** The judge's probability for the proposal, 0..1. */
  probability: number;
}

interface PurchaseOrderDraft extends GateDecision {
  quantity: number;
}

export interface MerchandisingPanel {
  /** Which judge produced the scores: the real Jev, or the demo stand-in. */
  judge: "typesafe" | "demo";
  scored: ScoredProduct[];
  currentDeal: ProductRow | null;
  deal: (GateDecision & { score: number }) | null;
  purchaseOrder: PurchaseOrderDraft | null;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** How much of the urgency comes from the shelf running dry vs. the item selling well. */
function stockPressure(stock: number, daysOfCover: number | null): number {
  if (stock === 0) return 1;
  if (daysOfCover === null) return stock < LOW_STOCK ? 0.35 : 0.1;
  if (daysOfCover <= 3) return 0.95;
  if (daysOfCover <= 7) return 0.85;
  if (daysOfCover <= 14) return 0.65;
  if (daysOfCover <= 30) return 0.4;
  return 0.15;
}

/** The facts about one product, with the reasons a manager will read. */
export function productSignals(
  product: ProductRow,
  stats: SalesStats | undefined,
  maxRevenueCents: number,
): ProductSignals {
  const unitsRecent = stats?.unitsRecent ?? 0;
  const revenueRecentCents = stats?.revenueRecentCents ?? 0;
  const daysOfCover = unitsRecent > 0 ? product.stock / (unitsRecent / 30) : null;
  const sellerStrength = maxRevenueCents > 0 ? revenueRecentCents / maxRevenueCents : 0;
  const urgency = clamp01(0.75 * stockPressure(product.stock, daysOfCover) + 0.25 * sellerStrength);

  const reasons: string[] = [];
  if (product.stock === 0) reasons.push("Out of stock");
  else if (product.stock < LOW_STOCK) reasons.push(`Only ${product.stock} left on the shelf`);
  if (unitsRecent > 0) {
    reasons.push(`Sold ${unitsRecent} in the last 30 days`);
    if (daysOfCover !== null && daysOfCover <= 30)
      reasons.push(`About ${Math.max(1, Math.ceil(daysOfCover))} days of cover at that rate`);
  } else {
    reasons.push("No sales in the last 30 days");
  }
  if (sellerStrength >= 0.5 && revenueRecentCents > 0)
    reasons.push("One of the strongest sellers by revenue this month");
  return {
    product,
    unitsRecent,
    revenueRecentCents,
    daysOfCover,
    urgency,
    reasons: reasons.slice(0, 3),
  };
}

/**
 * The restock rule, stated plainly so a manager can sanity-check the draft:
 * cover the next 30 days at the recent sales rate, with a floor of 10 units,
 * minus what's already on the shelf.
 */
export function suggestedRestockQuantity(signals: ProductSignals): number {
  const target = Math.max(Math.ceil(signals.unitsRecent), 10);
  return Math.max(0, target - signals.product.stock);
}

const URGENCY_QUESTION: Extract<JudgeQuestion, { type: "score" }> = {
  type: "score",
  instructions:
    "Rate how urgently this product needs a restock, from its stock, recent sales and days of cover.",
  criteria: [
    "plenty of cover — no action needed",
    "healthy — selling at a pace the shelf can sustain",
    "watch — cover is thinning",
    "urgent — likely to run out within two weeks at the recent rate",
    "critical — out of stock, or days from it",
  ],
};

const stateFor = (signals: ProductSignals) => ({
  product: signals.product.name,
  department: signals.product.department,
  stock: signals.product.stock,
  unitsSoldLast30Days: signals.unitsRecent,
  daysOfCover: signals.daysOfCover === null ? "no recent sales" : Math.ceil(signals.daysOfCover),
  lifetimeSales: formatUsd(signals.product.product_sales_cents),
  // Deterministic signals the demo judge reads. The real judge gets the facts above.
  urgency: signals.urgency,
});

/** Builds the whole panel. Products are judged one at a time; the catalogue is small. */
export async function buildPanel(
  db: Db,
  env: JudgeEnv,
  fetchFn: FetchFn = fetch,
): Promise<MerchandisingPanel> {
  const [products, stats] = await Promise.all([
    listProducts(db, { includeInactive: true }),
    productSalesStats(db),
  ]);
  const active = products.filter((product) => product.active === 1);
  const maxRevenue = Math.max(0, ...active.map((p) => stats.get(p.id)?.revenueRecentCents ?? 0));
  const kinds: ("typesafe" | "demo")[] = [];

  const scored: ScoredProduct[] = [];
  for (const product of active) {
    const signals = productSignals(product, stats.get(product.id), maxRevenue);
    const { answers, judge } = await judgeWithFallback(
      env,
      stateFor(signals),
      { urgency: URGENCY_QUESTION },
      fetchFn,
    );
    kinds.push(judge);
    const answer = answers.urgency;
    const level =
      answer?.type === "score"
        ? answer.score
        : signals.urgency * (URGENCY_QUESTION.criteria.length - 1);
    const confidence = answer?.type === "score" ? answer.confidence : 0;
    scored.push({
      signals,
      score: Math.round((level / (URGENCY_QUESTION.criteria.length - 1)) * 100),
      confidence,
    });
  }
  scored.sort(
    (a, b) => b.score - a.score || a.signals.product.name.localeCompare(b.signals.product.name),
  );

  const currentDeal = active.find((product) => product.featured === 1) ?? null;

  const gate = async (
    entry: ScoredProduct,
    gateValue: number,
    question: JudgeQuestion,
  ): Promise<GateDecision> => {
    const { answers, judge } = await judgeWithFallback(
      env,
      { ...stateFor(entry.signals), gate: gateValue },
      { gate: question },
      fetchFn,
    );
    kinds.push(judge);
    const answer = answers.gate;
    const probability = answer?.type === "noul" ? answer.noul : gateValue;
    return { product: entry.signals.product, approved: probability >= 0.5, probability };
  };

  // A deal needs stock to sell: the best-scored product with at least 3 on the shelf.
  const dealEntry = scored.find(
    (entry) => entry.signals.product.stock >= 3 && entry.signals.product.id !== currentDeal?.id,
  );
  const deal = dealEntry
    ? {
        ...(await gate(dealEntry, dealEntry.score / 100, {
          type: "noul",
          instructions: "This product should be featured as today's deal of the day.",
          criteria: {
            true: "It is selling, it has stock to sell, and featuring it is likely to move units today.",
            false: "Featuring it would waste the slot — too little stock, or too little demand.",
          },
        })),
        score: dealEntry.score,
      }
    : null;

  const top = scored[0];
  const quantity = top ? suggestedRestockQuantity(top.signals) : 0;
  const purchaseOrder =
    top && quantity > 0
      ? {
          ...(await gate(
            top,
            top.signals.product.stock === 0
              ? 0.9
              : top.signals.daysOfCover === null
                ? 0.3
                : top.signals.daysOfCover <= 14
                  ? 0.9
                  : top.signals.daysOfCover <= 30
                    ? 0.55
                    : 0.2,
            {
              type: "noul",
              instructions: "This restock should be ordered now, at the drafted quantity.",
              criteria: {
                true: "Cover is short enough that waiting risks a stockout.",
                false: "The shelf can wait — cover is adequate or demand is unproven.",
              },
            },
          )),
          quantity,
        }
      : null;

  return {
    judge: kinds.length > 0 && kinds.every((kind) => kind === "typesafe") ? "typesafe" : "demo",
    scored,
    currentDeal,
    deal,
    purchaseOrder,
  };
}
