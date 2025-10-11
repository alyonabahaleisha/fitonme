# Analytics Instrumentation Gaps

## Current State
**Events Found**: 0
**Target Funnel Events**: 9

⚠️ **CRITICAL: No analytics tracking found!**

No calls to `analytics.track()`, `gtag()`, `logEvent()`, or similar found in codebase.

## Target Funnel vs. Reality

| Funnel Step | Expected Event | Status | File | Fix |
|-------------|----------------|--------|------|-----|
| Landing | `Landing` | ❌ Missing | - | Add tracking |
| StartOnboarding | `StartOnboarding` | ❌ Missing | - | Add tracking |
| PhotoUploaded | `PhotoUploaded` | ❌ Missing | - | Add tracking |
| BodyScanSuccess | `BodyScanSuccess` | ❌ Missing | - | Add tracking |
| FirstLookGenerated | `FirstLookGenerated` | ❌ Missing | - | Add tracking |
| LookSaved | `LookSaved` | ❌ Missing | - | Add tracking |
| ShareTapped | `ShareTapped` | ❌ Missing | - | Add tracking |
| StoreClickOut | `StoreClickOut` | ❌ Missing | - | Add tracking |
| PurchaseConfirmed | `PurchaseConfirmed` | ❌ Missing | - | Add tracking |

## Missing Events - Implementation

### Landing
**File**: `src/pages/Home.jsx`
**Location**: useEffect on mount

```javascript
useEffect(() => {
  analytics.track('Landing', { referrer: document.referrer });
}, []);
```

### StartOnboarding
**File**: `src/pages/Home.jsx`
**Location**: onClick handler for "Get Started" button

```javascript
onClick={() => {
  analytics.track('StartOnboarding');
  setShowUpload(true);
}}
```

### PhotoUploaded
**File**: `src/components/PhotoUpload.jsx`
**Location**: handleFile after successful upload

```javascript
analytics.track('PhotoUploaded', {
  fileSize: file.size,
  fileType: file.type,
  timestamp: Date.now()
});
```

### FirstLookGenerated
**File**: `src/hooks/useOutfitOverlay.js`
**Location**: applyOutfit after successful overlay

```javascript
analytics.track('FirstLookGenerated', {
  outfitId: outfit.id,
  processingTime: Date.now() - startTime,
  fromCache: !!cached
});
```

### LookSaved
**File**: `src/components/OutfitViewer.jsx`
**Location**: toggleFavorite when adding to favorites

```javascript
onClick={() => {
  const wasAdded = !isFavorite;
  toggleFavorite(outfit.id);
  if (wasAdded) analytics.track('LookSaved', { outfitId: outfit.id });
}}
```

### ShareTapped
**File**: `src/components/OutfitViewer.jsx`
**Location**: Share button onClick

```javascript
onClick={() => {
  analytics.track('ShareTapped', { outfitId: outfit.id });
  setShowShareModal(true);
}}
```

### StoreClickOut
**File**: `src/components/ShareModal.jsx`
**Location**: shareToSocial function

```javascript
analytics.track('StoreClickOut', {
  platform,
  outfitId: outfit?.id,
  url: urls[platform]
});
```

## Analytics Setup Required

### 1. Install Analytics Library
```bash
npm install @segment/analytics-next
# OR
npm install @amplitude/analytics-browser
```

### 2. Create Analytics Wrapper
```javascript
// src/lib/analytics.js
import { AnalyticsBrowser } from '@segment/analytics-next'

const analytics = AnalyticsBrowser.load({ writeKey: import.meta.env.VITE_SEGMENT_KEY })

export const track = (event, properties = {}) => {
  analytics.track(event, {
    ...properties,
    timestamp: new Date().toISOString(),
    page: window.location.pathname
  })
}

export const identify = (userId, traits = {}) => {
  analytics.identify(userId, traits)
}
```

### 3. Add to .env
```
VITE_SEGMENT_KEY=your_write_key_here
```

