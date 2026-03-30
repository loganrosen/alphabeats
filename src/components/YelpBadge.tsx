import type { YelpEnrichment } from "../hooks/yelpEnrichment.js";

export default function YelpBadge({
  data,
  loading,
  fallbackUrl,
}: {
  data: YelpEnrichment | null;
  loading: boolean;
  fallbackUrl: string;
}) {
  if (loading) {
    return (
      <span className="font-mono text-xs text-zinc-300 dark:text-zinc-600 animate-pulse">
        ···
      </span>
    );
  }

  if (!data) {
    return (
      <a
        href={fallbackUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300"
      >
        Yelp ↗
      </a>
    );
  }

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-yellow-600 hover:text-yellow-500 transition-colors dark:text-yellow-400 dark:hover:text-yellow-300 inline-flex items-center gap-1"
      title={`${data.rating} stars on Yelp (${data.reviewCount} reviews)`}
    >
      <span>⭐ {data.rating}</span>
      <span className="text-zinc-400 dark:text-zinc-500">
        ({data.reviewCount})
      </span>
      {data.price && (
        <span className="text-zinc-500 dark:text-zinc-400">· {data.price}</span>
      )}
    </a>
  );
}
