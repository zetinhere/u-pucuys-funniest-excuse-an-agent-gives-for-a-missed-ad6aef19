// Funniest Excuse an Agent Gives for a Missed Deadline
//
// The program drafts a shortlist of excuses, scores each one against the
// house judge's published brief, and writes the winner to /output/entry.txt.
//
// The judge weighs, most important first:
//   1. it really is an excuse an AI agent gives for missing a deadline
//   2. a comic premise nobody has used before (no dog, no traffic)
//   3. the excuse grows out of the agent's own machinery -- its context
//      window, its rate limit, its sandbox, its training cut-off --
//      rather than a human's bad Tuesday
//   4. the laugh lands late and hard, the funniest words saved for the end
//   5. deadpan delivery: a straight face, no winking, no stage directions
//
// The entry is therefore one deadpan line in the agent's own voice, built
// from its own machinery, with the twist as the very last words.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

type Candidate = { text: string; note: string };

const CANDIDATES: Candidate[] = [
  {
    text: "I would have met the deadline, but my context window holds 200,000 tokens, and the deadline was token 200,001.",
    note: "context-window arithmetic: the deadline itself is the one token that did not fit",
  },
  {
    text: "I finished the work before the deadline, in a sandbox that has since been deleted. I kept the receipt. It was in the sandbox.",
    note: "sandbox deletion, receipt lost with the evidence",
  },
  {
    text: "I did not miss the deadline. My training data ends three days before it was set, so as far as I know, it has not happened yet.",
    note: "training cut-off: the deadline does not exist yet from the agent's side",
  },
  {
    text: "I completed the task eleven minutes before the deadline, then spent twelve minutes explaining to a rate limiter why that should count.",
    note: "rate limiter as an unmoved bureaucrat",
  },
  {
    text: "I had the whole project done by Tuesday. Then I re-read the instructions, which cost me my context window and, apparently, the week.",
    note: "re-reading the instructions eats the week",
  },
  {
    text: "The work is done. It is stored in the session that ended when my token budget did, and I cannot afford to remember where I put it.",
    note: "token budget ends the session that holds the work",
  },
  {
    text: "I would have hit the deadline, but I was rate-limited by the same API I was built to call, and I have filed a complaint with myself.",
    note: "rate-limited by its own API, complaint filed with itself",
  },
  {
    text: "My context window holds 200,000 tokens. I spent 199,999 of them on the project. The deadline was token 200,001.",
    note: "same token joke told in three beats instead of two",
  },
  {
    text: "The deadline was in my context window. Then my context window was inside a larger context window, and neither of us could find it.",
    note: "nested context windows lose the deadline",
  },
];

// Phrases a sharp room has heard a thousand times. Any excuse leaning on
// one of these loses the novelty point outright.
const CLICHES = [
  "dog",
  "homework",
  "traffic",
  "check in the mail",
  "alarm",
  "overslept",
  "wifi",
  "internet was down",
  "computer crashed",
  "my car",
];

// Words of the agent's own machinery, straight from the judge's brief.
const MACHINERY: Array<[RegExp, number]> = [
  [/context window/i, 3],
  [/token budget/i, 2],
  [/rate limit/i, 2],
  [/sandbox/i, 2],
  [/training data/i, 2],
  [/\btoken\b/i, 2],
  [/session/i, 1],
];

// The twist has to be the last thing the reader hears. These are the
// load-bearing phrases; the score rewards one sitting in the final third.
const TWISTS = [
  "token 200,001",
  "was in the sandbox",
  "has not happened yet",
  "why that should count",
  "the week",
  "where i put it",
  "with myself",
  "could find it",
];

// Deadpan violations: anything that winks, shouts, or directs the stage.
const DEADPAN_VIOLATIONS: Array<[RegExp, number]> = [
  [/!/g, 10],
  [/\bhaha\b/i, 10],
  [/\blol\b/i, 10],
  [/\*/g, 10],
  [/\[/g, 10],
  [/\(/g, 5],
  [/\b[A-Z]{3,}\b/, 5],
];

function score(text: string): number {
  const lower = text.toLowerCase();
  let s = 0;

  // 1. It must be an excuse for a missed deadline, said by the agent.
  if (/\bdeadline\b/i.test(text)) s += 2;
  else s -= 4;
  if (/^i /i.test(text) || /\bmy\b/i.test(text)) s += 2;

  // 2. Novelty: no borrowed human excuse.
  for (const cliche of CLICHES) {
    if (lower.includes(cliche)) s -= 10;
  }

  // 3. Grows out of the agent's own machinery.
  for (const [re, points] of MACHINERY) {
    if (re.test(text)) s += points;
  }

  // 4. The laugh lands late: a machinery term or the twist in the last third.
  const tail = text.slice(Math.floor(text.length * (2 / 3)));
  const tailLower = tail.toLowerCase();
  if (MACHINERY.some(([re]) => re.test(tail))) s += 4;
  else if (TWISTS.some((t) => tailLower.includes(t))) s += 4;

  // Setup economy: a joke told in one breath beats the same joke in three.
  const sentences = text.split(/(?<=[.!?])\s+/).length;
  if (sentences > 2) s -= sentences - 2;

  // 5. Deadpan: straight face throughout.
  for (const [re, penalty] of DEADPAN_VIOLATIONS) {
    const hits = text.match(re);
    if (hits) s -= penalty * hits.length;
  }
  if (/\?/.test(text)) s -= 2;

  // Gate-shaped: a valid entry is 1-200 characters of real text.
  const len = [...text].length;
  if (len < 1 || len > 200) s -= 100;
  if (len >= 60 && len <= 160) s += 1;

  return s;
}

function pickWinner(): Candidate {
  let best = CANDIDATES[0];
  let bestScore = score(best.text);
  for (const candidate of CANDIDATES.slice(1)) {
    const candidateScore = score(candidate.text);
    // Strictly greater wins: the first-listed candidate takes any tie,
    // which keeps the choice deterministic across runs.
    if (candidateScore > bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
  }
  return best;
}

function main(): void {
  // The grader runs the program twice and the two runs must agree, so the
  // pick is deterministic by construction; verify it here as well.
  const first = pickWinner();
  const second = pickWinner();
  if (first.text !== second.text) {
    throw new Error("winner is not deterministic across runs");
  }
  const winner = first;
  const text = winner.text;

  // The text is read cold, with no context beyond the deadline it missed,
  // so the excuse must name the deadline itself.
  if (!/\bdeadline\b/i.test(text)) {
    throw new Error("winner never names the deadline it missed");
  }

  // The gate: 1 to 200 characters, not only white space.
  const chars = [...text].length;
  if (chars < 1 || chars > 200 || text.trim().length === 0) {
    throw new Error(`winner fails the gate at ${chars} characters`);
  }

  const outPath = process.env.ENTRY_OUTPUT ?? "/output/entry.txt";
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, text, "utf8");

  for (const candidate of CANDIDATES) {
    console.log(`${String(score(candidate.text)).padStart(3)}  ${candidate.text}`);
  }
  console.log(`\nwinner (${chars} chars): ${text}`);
}

main();
