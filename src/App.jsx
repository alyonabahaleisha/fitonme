import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Index from './pages/Index';
import TryOn from './pages/TryOn';
import Closet from './pages/Closet';
import MyStyle from './pages/MyStyle';
import Legal from './pages/Legal';
import PaymentSuccess from './pages/PaymentSuccess';
import AuthCallback from './pages/AuthCallback';
import useAppStore from './store/useAppStore';
import { getAllOutfits } from './services/outfitService';
import { prefetchOutfitImages } from './lib/image-processor';
import { initGA, trackPageView } from './services/analytics';

import Layout from './components/Layout';
import MinimalNav from './components/MinimalNav';

// Component to track page views
function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
}

function App() {
  const { setOutfits, setLoading } = useAppStore();

  // Initialize Google Analytics
  useEffect(() => {
    initGA();
  }, []);

  // Load published outfits from Supabase (shared database with Admin)
  useEffect(() => {
    const loadOutfits = async () => {
      try {
        setLoading(true);
        const outfits = await getAllOutfits();
        setOutfits(outfits);
        console.log('[App] Loaded outfits from Supabase:', outfits.length);

        // Prefetch outfit images immediately (non-blocking, limited concurrency)
        // This happens BEFORE user uploads photo, so images are ready
        const imageUrls = outfits.slice(0, 10).map(o => o.imageUrl);
        prefetchOutfitImages(imageUrls);
      } catch (error) {
        console.error('Error loading outfits:', error);
        // Don't show alert on initial load failure - Supabase might not be configured yet
      } finally {
        setLoading(false);
      }
    };

    loadOutfits();
  }, [setOutfits, setLoading]);

  return (
    <Router>
      <PageViewTracker />
      <Routes>
        <Route path="/payment-success" element={<PaymentSuccess />} />
        {/* Home page - no navigation, clean emotional screen */}
        <Route path="/" element={<Index />} />
        {/* Pages with full navigation */}
        <Route element={<Layout />}>
          <Route path="/closet" element={<Closet />} />
          <Route path="/legal/:slug" element={<Legal />} />
        </Route>
        <Route path="/try-on" element={<TryOn />} />
        <Route path="/my-style" element={<MyStyle />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
