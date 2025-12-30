'use client';

export default function AreaBidPage() {
  return (
    <div className="h-[calc(100vh-4rem)] -m-6">
      <iframe
        src="https://area-bid-helper.vercel.app"
        className="w-full h-full border-0"
        title="Area Bid Helper"
        allow="geolocation"
      />
    </div>
  );
}
