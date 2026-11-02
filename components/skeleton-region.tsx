/**
 * Wireframe placeholder. Marks out where real content will live, with a label
 * naming what goes there and an optional note. Purely structural — this whole
 * file gets deleted once real sections replace the regions.
 */
export const SkeletonRegion = ({
  label,
  note,
  height = "md",
}: {
  label: string;
  note?: string;
  height?: "sm" | "md" | "lg";
}) => {
  const heights = { sm: "min-h-20", md: "min-h-40", lg: "min-h-64" };

  return (
    <section
      className={`${heights[height]} border-border flex flex-col items-start justify-center gap-1 rounded-sm border border-dashed p-6`}
    >
      <p className="font-mono text-xs tracking-widest uppercase">{label}</p>
      {note ? (
        <p className="text-muted-foreground font-mono text-xs">{note}</p>
      ) : null}
    </section>
  );
};
