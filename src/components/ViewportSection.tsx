import React, { useEffect, useRef, useState } from 'react';

type ViewportSectionProps = {
  children: React.ReactNode;
  rootMargin?: string;
  minHeight?: number;
};

/**
 * Defer rendering of heavy sections until they are close to the viewport.
 * This keeps the landing experience snappy by avoiding upfront work.
 */
const ViewportSection: React.FC<ViewportSectionProps> = ({
  children,
  rootMargin = '320px',
  minHeight = 420,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;
    const node = containerRef.current;
    const isServer = typeof window === 'undefined';
    const lacksObserver = !isServer && !('IntersectionObserver' in window);

    if (!node || isServer || lacksObserver) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div
      ref={containerRef}
      className="viewport-section"
      aria-busy={!shouldRender}
      style={!shouldRender ? { minHeight } : undefined}
    >
      {shouldRender ? (
        children
      ) : (
        <div
          className="section-placeholder"
          role="status"
          aria-live="polite"
        >
          <span className="sr-only">Section content loading</span>
        </div>
      )}
    </div>
  );
};

export default ViewportSection;
