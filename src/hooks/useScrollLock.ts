import { useEffect } from 'react';

export const useScrollLock = (isLocked: boolean) => {
    useEffect(() => {
        if (!isLocked) return;

        console.log('[useScrollLock] Locking scroll');

        // Save original body style
        const originalStyle = window.getComputedStyle(document.body).overflow;
        const originalPaddingRight = window.getComputedStyle(document.body).paddingRight;

        // Prevent scrolling
        document.body.style.overflow = 'hidden';

        // Get scrollbar width
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        console.log('[useScrollLock] Scrollbar width:', scrollbarWidth);

        // Add padding to prevent layout shift if scrollbar exists
        if (scrollbarWidth > 0) {
            const paddingRight = `${parseInt(originalPaddingRight || '0', 10) + scrollbarWidth}px`;
            document.body.style.paddingRight = paddingRight;

            // Also add padding to fixed header to prevent it from jumping
            // We target the nav element which has fixed positioning
            const nav = document.querySelector('nav');
            if (nav) {
                nav.style.paddingRight = `${scrollbarWidth}px`;
            }
        }

        return () => {
            console.log('[useScrollLock] Unlocking scroll');
            document.body.style.overflow = originalStyle;
            document.body.style.paddingRight = originalPaddingRight;

            // Reset nav padding
            const nav = document.querySelector('nav');
            if (nav) {
                nav.style.paddingRight = '';
            }
        };
    }, [isLocked]);
};
