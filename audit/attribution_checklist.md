# Attribution & Click Tracking

## Current State

⚠️ **Issues Found**: 4

| Type | File | Line | Severity | Fix |
|------|------|------|----------|-----|
| share_not_tracked | src/store/useAppStore.js | - | high | Add analytics tracking for share events |
| share_not_tracked | src/pages/TryOn.jsx | - | high | Add analytics tracking for share events |
| share_not_tracked | src/components/ShareModal.jsx | - | high | Add analytics tracking for share events |
| share_not_tracked | src/components/OutfitViewer.jsx | - | high | Add analytics tracking for share events |

## Checklist

- [ ] Outbound links include UTM parameters
- [ ] Server-side click log for store links
- [ ] Purchase webhooks map back to users/looks
- [ ] Share events tracked with platform + outfit ID
- [ ] Download events tracked
- [ ] Referral source captured on landing

## Implementation: Server-Side Click Logger

```javascript
// server/routes/track.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

router.post('/clickout', async (req, res) => {
  const { userId, outfitId, platform, targetUrl } = req.body;
  
  // Idempotent logging
  const { data, error } = await supabase
    .from('clickouts')
    .upsert({
      user_id: userId,
      outfit_id: outfitId,
      platform,
      target_url: targetUrl,
      clicked_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,outfit_id,platform',
      ignoreDuplicates: true
    });
  
  if (error) console.error(error);
  
  res.json({ success: true });
});

export default router;
```

## Frontend Integration

```javascript
// src/components/ShareModal.jsx
const shareToSocial = async (platform) => {
  const url = generateStoreUrl(platform); // with UTM
  
  // Track clickout server-side
  await fetch('/api/track/clickout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user?.id,
      outfitId: outfit.id,
      platform,
      targetUrl: url
    })
  });
  
  window.open(url, '_blank');
};
```

## UTM Parameter Helper

```javascript
// src/lib/utm.js
export const addUTM = (baseUrl, { source, medium, campaign, content }) => {
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", source || "godlovesme_app");
  url.searchParams.set("utm_medium", medium || "share");
  url.searchParams.set("utm_campaign", campaign || "outfit_share");
  if (content) url.searchParams.set("utm_content", content);
  return url.toString();
};
```

