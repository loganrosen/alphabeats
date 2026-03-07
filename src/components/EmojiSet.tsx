/** Renders a deduplicated row of emoji badges from categorized items. */
export default function EmojiSet<T>({
  items,
  categorize,
}: {
  items: T[];
  categorize: (item: T) => { emoji: string; label: string };
}) {
  const seen = new Map<string, string>();
  for (const item of items) {
    const { emoji, label } = categorize(item);
    if (!seen.has(emoji)) seen.set(emoji, label);
  }
  return (
    <>
      {[...seen.entries()].map(([emoji, label]) => (
        <span key={emoji} title={label} className="cursor-default">
          {emoji}
        </span>
      ))}
    </>
  );
}
