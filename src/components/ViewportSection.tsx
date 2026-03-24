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

    // Exit early when the DOM node is missing, during SSR, or if IntersectionObserver isn't supported.
    const isMissingNode = !node;
    const isServer = typeof window === 'undefined';
    const lacksObserver = isServer ? false : !('IntersectionObserver' in window);

    if (isMissingNode || isServer || lacksObserver) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldRender(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  return (
    <div
      ref={containerRef}
      className="viewport-section"
      style={!shouldRender ? { minHeight } : undefined}
    >
      {shouldRender ? (
        children
      ) : (
        <div
          className="section-placeholder"
          role="status"
          aria-live="polite"
          aria-label="Section content loading"
        />
      )}
    </div>
  );
};

export default React.memo(ViewportSection);
