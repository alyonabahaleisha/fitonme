import { useEffect } from 'react';

// Cache scrollbar width (only compute once)
let cachedScrollbarWidth: number | null = null;

const getScrollbarWidth = () => {
    if (cachedScrollbarWidth !== null) return cachedScrollbarWidth;
    cachedScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    return cachedScrollbarWidth;
};

export const useScrollLock = (isLocked: boolean) => {
    useEffect(() => {
        if (!isLocked) return;

        // Read all layout values FIRST (batch reads)
        const originalStyle = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth = getScrollbarWidth();
        const nav = document.querySelector('nav');

        // Then batch all writes (no interleaved reads/writes)
        requestAnimationFrame(() => {
            document.body.style.overflow = 'hidden';

            if (scrollbarWidth > 0) {
                const currentPadding = parseInt(originalPaddingRight || '0', 10);
                document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;

                if (nav) {
                    (nav as HTMLElement).style.paddingRight = `${scrollbarWidth}px`;
                }
            }
        });

        return () => {
            document.body.style.overflow = originalStyle;
            document.body.style.paddingRight = originalPaddingRight;

            if (nav) {
                (nav as HTMLElement).style.paddingRight = '';
            }
        };
    }, [isLocked]);
};
