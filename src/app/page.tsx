import { Suspense } from 'react';
import HomeContent from './HomeContent';

export default function Page() {
  return (
    <Suspense fallback={<div className="text-white text-center mt-20">Yükleniyor...</div>}>
      <HomeContent />
    </Suspense>
  );
}
