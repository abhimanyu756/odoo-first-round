// Two half-open time ranges [aStart, aEnd) and [bStart, bEnd) overlap iff
// aStart < bEnd AND aEnd > bStart. Touching endpoints (9-10 and 10-11) do NOT overlap.
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

module.exports = { rangesOverlap };
