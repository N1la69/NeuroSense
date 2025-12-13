export function aggregateP300(
  probs: number[],
  events: number[],
  runsPerBlock: number
) {
  const BLOCKS = Math.floor(probs.length / (8 * runsPerBlock));

  const results = [];

  let idx = 0;
  for (let block = 0; block < BLOCKS; block++) {
    const sums = Array(8).fill(0);
    const counts = Array(8).fill(0);

    for (let r = 0; r < runsPerBlock; r++) {
      for (let e = 0; e < 8; e++) {
        const obj = events[idx] - 1; // 0-based
        sums[obj] += probs[idx];
        counts[obj] += 1;
        idx++;
      }
    }

    const avgs = sums.map((s, i) => s / Math.max(1, counts[i]));
    const predicted = avgs.indexOf(Math.max(...avgs)) + 1;

    results.push({
      block: block + 1,
      averages: avgs,
      predictedObject: predicted,
    });
  }

  return results;
}
