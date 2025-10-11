# Performance & Latency Analysis

## Bundle Size Analysis

**Total Source Size**: 50.74 KB

### Largest Files
| File | Size (KB) |
|------|----------|
| src/components/AdminOutfitUpload.jsx | 11.47 |
| src/components/OutfitCarousel.jsx | 6.40 |
| src/components/ShareModal.jsx | 5.99 |
| src/components/OutfitViewer.jsx | 5.98 |
| src/lib/image-processor.js | 4.55 |
| src/components/PhotoUpload.jsx | 4.50 |
| src/pages/Home.jsx | 3.77 |
| src/lib/gemini-client.js | 2.29 |
| src/store/useAppStore.js | 1.76 |
| src/pages/TryOn.jsx | 1.68 |

## Async Boundary Issues

| Type | File | Line | Severity | Impact |
|------|------|------|----------|--------|
| no_code_splitting | src/main.jsx | - | medium | All routes bundled together; slow initial load |
| no_code_splitting | src/App.jsx | - | medium | All routes bundled together; slow initial load |
| blocking_await | src/lib/image-processor.js | 23 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/lib/image-processor.js | 24 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/lib/image-processor.js | 33 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/lib/image-processor.js | 34 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/lib/image-processor.js | 37 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/lib/image-processor.js | 38 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/lib/image-processor.js | 46 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/lib/image-processor.js | 52 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/lib/image-processor.js | 56 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/lib/gemini-client.js | 27 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/lib/gemini-client.js | 28 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/lib/gemini-client.js | 55 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/lib/gemini-client.js | 65 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/hooks/useOutfitOverlay.js | 18 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/components/ShareModal.jsx | 17 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/components/PhotoUpload.jsx | 27 | high | Blocks rendering; user sees frozen UI |
| blocking_await | src/components/AdminOutfitUpload.jsx | 60 | high | Blocks rendering; user sees frozen UI |

## Optimizations

### 1. Code Splitting (High Priority)
**Current**: All routes bundled in main chunk

**Fix**: Lazy load routes
```javascript
// src/App.jsx
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./pages/Home'));
const TryOn = lazy(() => import('./pages/TryOn'));
const Admin = lazy(() => import('./pages/Admin'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>...</Routes>
      </Suspense>
    </Router>
  );
}
```

### 2. Image Processing Off Main Thread
**Current**: Image overlay blocks rendering

**Fix**: Use Web Worker
```javascript
// src/workers/image-overlay.worker.js
self.onmessage = async (e) => {
  const { userPhoto, outfitUrl } = e.data;
  const result = await processImage(userPhoto, outfitUrl);
  self.postMessage(result);
};

// src/hooks/useOutfitOverlay.js
const worker = new Worker(new URL('../workers/image-overlay.worker.js', import.meta.url));
```

### 3. Prefetch Outfit Images
**Current**: Outfits loaded on-demand

**Fix**: Prefetch on landing
```javascript
// src/pages/Home.jsx
useEffect(() => {
  // Prefetch top 5 outfits
  fetch('/api/outfits/popular').then(res => res.json()).then(outfits => {
    outfits.slice(0, 5).forEach(outfit => {
      const img = new Image();
      img.src = outfit.imageUrl;
    });
  });
}, []);
```

### 4. Memoize Expensive Renders
```javascript
// src/components/OutfitCarousel.jsx
import { useMemo } from 'react';

const renderedOutfits = useMemo(() => 
  outfits.map(outfit => <OutfitCard key={outfit.id} outfit={outfit} />),
  [outfits]
);
```

### 5. Optimize Zustand Store
**Current**: Entire store re-renders on any change

**Fix**: Selective subscriptions
```javascript
// Instead of:
const { userPhoto, outfits } = useAppStore();

// Use:
const userPhoto = useAppStore(state => state.userPhoto);
const outfits = useAppStore(state => state.outfits);
```

