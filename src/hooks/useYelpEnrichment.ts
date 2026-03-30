import { useEffect, useState } from "react";
import {
  fetchYelpEnrichment,
  type UseYelpEnrichmentResult,
  type YelpEnrichment,
} from "./yelpEnrichment.js";

export function useYelpEnrichment(
  name: string,
  address: string,
  city: string,
  zip: string,
): UseYelpEnrichmentResult {
  const [data, setData] = useState<YelpEnrichment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name || !address) {
      setLoading(false);
      return;
    }

    let active = true;
    setData(null);
    setLoading(true);

    fetchYelpEnrichment(name, address, city, zip).then((result) => {
      if (active) {
        setData(result);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [name, address, city, zip]);

  return { data, loading };
}
