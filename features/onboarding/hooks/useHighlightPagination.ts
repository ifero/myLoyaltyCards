import { useMemo, useState } from 'react';

export const TOTAL_HIGHLIGHT_SLIDES = 3;

export const useHighlightPagination = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => {
    setCurrentIndex((previous) => Math.min(previous + 1, TOTAL_HIGHLIGHT_SLIDES - 1));
  };

  const goTo = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, TOTAL_HIGHLIGHT_SLIDES - 1)));
  };

  const skip = () => {
    setCurrentIndex(TOTAL_HIGHLIGHT_SLIDES - 1);
  };

  const isLast = useMemo(() => currentIndex === TOTAL_HIGHLIGHT_SLIDES - 1, [currentIndex]);

  return {
    currentIndex,
    next,
    goTo,
    skip,
    isLast,
    total: TOTAL_HIGHLIGHT_SLIDES
  };
};
