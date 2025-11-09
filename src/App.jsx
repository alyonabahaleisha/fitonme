import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import TryOn from './pages/TryOn';
import AuthCallback from './pages/AuthCallback';
import useAppStore from './store/useAppStore';
import { getAllOutfits } from './services/outfitService';

function App() {
  const { setOutfits, setLoading } = useAppStore();

  // Load published outfits from Supabase (shared database with Admin)
  useEffect(() => {
    const loadOutfits = async () => {
      try {
        setLoading(true);
        const outfits = await getAllOutfits();
        setOutfits(outfits);
        console.log('Loaded published outfits from Supabase:', outfits.length);
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
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/try-on" element={<TryOn />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </Router>
  );
}

export default App;
