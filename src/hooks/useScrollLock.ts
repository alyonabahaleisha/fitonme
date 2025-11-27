import { useEffect } from 'react';

export const useScrollLock = (isLocked: boolean) => {
    useEffect(() => {
        if (!isLocked) return;

        // Save original body style
        const originalStyle = window.getComputedStyle(document.body).overflow;
        const originalPaddingRight = window.getComputedStyle(document.body).paddingRight;

        // Prevent scrolling
        document.body.style.overflow = 'hidden';

        // Get scrollbar width
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        // Add padding to prevent layout shift if scrollbar exists
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${parseInt(originalPaddingRight || '0', 10) + scrollbarWidth}px`;
        }

        return () => {
            document.body.style.overflow = originalStyle;
            document.body.style.paddingRight = originalPaddingRight;
        };
    }, [isLocked]);
};
