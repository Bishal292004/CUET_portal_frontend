// Same rules as utils/chance.js + utils/recommend.js in the backend.
import type { Chance, ChanceLabel, ChanceResult, Cutoff, Recommendation } from "./types";

// Marks out of 300: your score minus the closing cutoff
export const BANDS = { high: 10, moderate: -10, low: -30 };
export const RANK: Record<ChanceLabel, number> = { HIGH: 3, MODERATE: 2, LOW: 1, UNLIKELY: 0, NO_DATA: -1 };

export function classify(difference: number): ChanceLabel {
  if (difference >= BANDS.high) return "HIGH";
  if (difference >= BANDS.moderate) return "MODERATE";
  if (difference >= BANDS.low) return "LOW";
  return "UNLIKELY";
}

export function pickCutoff(cutoffs: Cutoff[], category: string): Cutoff | null {
  const own = cutoffs.filter((c) => c.category === category);
  const pool = own.length ? own : cutoffs.filter((c) => c.category === "GEN");
  if (!pool.length) return null;
  return [...pool].sort((a, b) => b.year - a.year || a.round - b.round)[0] ?? null;
}

export function estimateChance({
  score,
  isExpected,
  cutoff,
  studentCategory,
}: {
  score?: number | undefined;
  isExpected?: boolean | undefined;
  cutoff?: Cutoff | null | undefined;
  studentCategory: string;
}): Chance {
  if (score === undefined) return { label: "NO_DATA", reason: "NO_SCORE" };
  if (!cutoff) return { label: "NO_DATA", reason: "NO_CUTOFF" };
  const difference = score - cutoff.closingScore;
  return {
    label: classify(difference),
    yourScore: score,
    isExpected: Boolean(isExpected),
    difference,
    cutoff: { closingScore: cutoff.closingScore, year: cutoff.year, round: cutoff.round, category: cutoff.category },
    fallbackToGeneral: cutoff.category !== studentCategory,
  };
}

const CHANCE_POINTS: Record<ChanceLabel, number> = { HIGH: 30, MODERATE: 20, LOW: 8, UNLIKELY: 0, NO_DATA: 0 };

export function recommendFrom(results: ChanceResult[], followed: Set<string>): Recommendation[] {
  return results
    .filter((r) => r.chance.label !== "UNLIKELY")
    .map((r) => {
      const reasons: string[] = [];
      let score = CHANCE_POINTS[r.chance.label];
      const suffix = r.chance.isExpected ? " (based on your expected score)" : "";
      if (r.chance.label === "HIGH") reasons.push(`Your score is above last year's cutoff${suffix}`);
      if (r.chance.label === "MODERATE") reasons.push(`Your score is close to last year's cutoff${suffix}`);
      if (r.chance.label === "LOW") reasons.push(`Below last year's cutoff, but within reach${suffix}`);
      if (r.inPreferredState) {
        score += 10;
        reasons.push("In one of your preferred states");
      }
      if (r.programme.university.admissionStatus === "OPEN") {
        score += 8;
        reasons.push("Admissions are open now");
      }
      if (followed.has(r.programme.university._id)) {
        score += 4;
        reasons.push("You follow this university");
      }
      return { ...r, score, reasons };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
