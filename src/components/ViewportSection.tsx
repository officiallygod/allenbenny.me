import React, { useEffect, useRef, useState } from 'react';

type ViewportSectionProps = {
  children: React.ReactNode;
  rootMargin?: string;
  minHeight?: number;
  id?: string;
};

/**
 * Defer rendering of heavy sections until they are close to the viewport.
 * This keeps the landing experience snappy by avoiding upfront work.
 */
const ViewportSection: React.FC<ViewportSectionProps> = ({
  children,
  rootMargin = '320px',
  minHeight = 420,
  id,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;
    const node = containerRef.current;
    const hasIntersectionObserver =
      typeof window !== 'undefined' && 'IntersectionObserver' in window;

    if (!node) return;

    if (!hasIntersectionObserver) {
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
  }, [rootMargin, shouldRender]);

  return (
    <div
      id={id}
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
          <span className="sr-only">Section content will load when in view</span>
        </div>
      )}
    </div>
  );
};

export default ViewportSection;
