import { useEffect, useState } from 'react';

/** Tracks whether the viewport matches a mobile-width media query (default < 640px). */
export function useIsMobile(query = '(max-width: 639px)'): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
