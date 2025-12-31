'use client';

export default function AreaBidPage() {
  return (
    <div className="fixed inset-0 top-16 md:-m-0 -mx-4 -mb-4">
      <iframe
        src="https://area-bid-helper.vercel.app"
        className="w-full h-full border-0"
        title="Area Bid Helper"
        allow="geolocation"
        style={{ minHeight: '100%' }}
      />
    </div>
  );
}
