import { useState } from 'react';
import Landing from './pages/Landing';
import MapView from './pages/MapView';
import './index.css';

export type Page = 'landing' | 'map';

export default function App() {
  const [page, setPage] = useState<Page>('landing');
  const [activeCityId, setActiveCityId] = useState<string | null>(null);
  const [activeCityName, setActiveCityName] = useState<string>('');

  const goToMap = (cityId: string, cityName: string) => {
    setActiveCityId(cityId);
    setActiveCityName(cityName);
    setPage('map');
  };

  const goToLanding = () => setPage('landing');

  return (
    <>
      {/* Persistent background */}
      <div className="app-bg" />
      <div className="app-bg-reflection" />
      <div className="scanlines" />

      {page === 'landing' && (
        <Landing onSelectCity={goToMap} />
      )}
      {page === 'map' && activeCityId && (
        <MapView
          cityId={activeCityId}
          cityName={activeCityName}
          onBack={goToLanding}
        />
      )}
    </>
  );
}
