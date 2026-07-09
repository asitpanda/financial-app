import { useEffect, useState, type RefObject } from 'react';

interface ViewportTableHeightOptions {
  bottomOffset?: number;
  minHeight?: number;
  defaultHeight?: number;
  deps?: ReadonlyArray<unknown>;
}

export function useViewportTableHeight(
  ref: RefObject<HTMLElement>,
  options: ViewportTableHeightOptions = {}
) {
  const {
    bottomOffset = 50,
    minHeight = 360,
    defaultHeight = 620,
    deps = [],
  } = options;
  const [tableHeight, setTableHeight] = useState(defaultHeight);
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    const updateTableHeight = () => {
      const element = ref.current;
      if (!element) return;

      const { top } = element.getBoundingClientRect();
      const nextHeight = Math.max(minHeight, Math.floor(window.innerHeight - top - bottomOffset));
      setTableHeight(nextHeight);
    };

    updateTableHeight();
    window.addEventListener('resize', updateTableHeight);

    return () => {
      window.removeEventListener('resize', updateTableHeight);
    };
  }, [ref, bottomOffset, minHeight, defaultHeight, depsKey]);

  return tableHeight;
}