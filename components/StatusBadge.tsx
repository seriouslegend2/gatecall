import { verdictMeta } from "@/lib/display";
import type { Verdict } from "@/lib/types";

/** Compact at-a-glance verdict pill for a passenger. */
export default function StatusBadge({ verdict }: { verdict: Verdict }) {
  const m = verdictMeta[verdict];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${m.tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
