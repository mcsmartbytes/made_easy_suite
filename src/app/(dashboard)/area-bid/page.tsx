'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface QuoteData {
  totalArea: number;
  totalPerimeter: number;
  unit: string;
  shapes: any[];
  heights: any[];
  notes: string;
  timestamp: string;
  // Concrete mode data
  concrete?: {
    slabs: Array<{
      id: string;
      area_sqft: number;
      thickness_in: number;
      finish: string;
      reinforcement: string;
      demo_included: boolean;
      cubic_yards: number;
    }>;
    lines: Array<{
      id: string;
      lineal_feet: number;
      line_type: 'saw_cut' | 'forming' | 'thickened_edge';
    }>;
    totalCubicYards: number;
    quoteTotal: number;
  };
  // Stall striping data
  stallGroups?: Array<{
    id: string;
    stall_count: number;
    lineal_feet: number;
    row_length_ft: number;
  }>;
}

export default function AreaBidPage() {
  const router = useRouter();
  const [receivedData, setReceivedData] = useState<QuoteData | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState('256px');
  const [isClient, setIsClient] = useState(false);

  // Track sidebar collapsed state and calculate width
  useEffect(() => {
    setIsClient(true);

    const updateSidebarWidth = () => {
      // On mobile, sidebar is hidden
      if (window.innerWidth < 768) {
        setSidebarWidth('0px');
        return;
      }
      const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      setSidebarWidth(collapsed ? '64px' : '256px');
    };

    updateSidebarWidth();

    // Listen for storage changes
    window.addEventListener('storage', updateSidebarWidth);
    window.addEventListener('resize', updateSidebarWidth);

    // Poll for changes since storage event doesn't fire in same tab
    const interval = setInterval(updateSidebarWidth, 100);

    return () => {
      window.removeEventListener('storage', updateSidebarWidth);
      window.removeEventListener('resize', updateSidebarWidth);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Security: only accept messages from Area Bid Pro
      if (!event.origin.includes('area-bid-helper.vercel.app')) return;
      if (event.data?.source !== 'area-bid-pro') return;

      console.log('Received message from Area Bid Pro:', event.data);

      if (event.data.type === 'AREA_BID_PRO_EXPORT_QUOTE') {
        const quoteData = event.data.payload as QuoteData;
        setReceivedData(quoteData);
        setShowBanner(true);

        // Store in sessionStorage for the estimate form to pick up
        const calculatorItems: Array<{
          service_id: string;
          service_name: string;
          description: string;
          quantity: number;
          unit_price: number;
        }> = [];

        // Handle Concrete mode data
        if (quoteData.concrete) {
          const { slabs, lines, totalCubicYards, quoteTotal } = quoteData.concrete;

          calculatorItems.push({
            service_id: "",
            service_name: `Concrete Work: ${quoteData.totalArea.toFixed(0)} sq ft`,
            description: `${slabs.length} slab(s), ${totalCubicYards.toFixed(2)} yd³ total`,
            quantity: Math.ceil(quoteData.totalArea),
            unit_price: quoteTotal > 0 ? quoteTotal / Math.ceil(quoteData.totalArea) : 0
          });

          slabs.forEach((slab, idx) => {
            calculatorItems.push({
              service_id: "",
              service_name: `Slab ${idx + 1}: ${slab.area_sqft.toFixed(0)} sq ft`,
              description: `${slab.thickness_in}" thick, ${slab.finish} finish, ${slab.reinforcement}${slab.demo_included ? ', includes demo' : ''} - ${slab.cubic_yards.toFixed(2)} yd³`,
              quantity: Math.ceil(slab.area_sqft),
              unit_price: 0
            });
          });

          lines.forEach((line) => {
            const typeLabels: Record<string, string> = {
              saw_cut: 'Saw Cuts',
              forming: 'Forming',
              thickened_edge: 'Thickened Edge'
            };
            calculatorItems.push({
              service_id: "",
              service_name: `${typeLabels[line.line_type] || line.line_type}: ${line.lineal_feet} lf`,
              description: `Linear measurement for ${typeLabels[line.line_type]?.toLowerCase() || line.line_type}`,
              quantity: Math.ceil(line.lineal_feet),
              unit_price: 0
            });
          });
        }
        // Handle Stall striping data
        else if (quoteData.stallGroups && quoteData.stallGroups.length > 0) {
          const totalStalls = quoteData.stallGroups.reduce((sum, g) => sum + g.stall_count, 0);
          const totalLinealFeet = quoteData.stallGroups.reduce((sum, g) => sum + g.lineal_feet, 0);

          calculatorItems.push({
            service_id: "",
            service_name: `Parking Lot Striping: ${totalStalls} stalls`,
            description: `${quoteData.stallGroups.length} row(s), ${totalLinealFeet.toFixed(0)} lineal feet total`,
            quantity: totalStalls,
            unit_price: 0
          });

          quoteData.stallGroups.forEach((group, idx) => {
            calculatorItems.push({
              service_id: "",
              service_name: `Row ${idx + 1}: ${group.stall_count} stalls`,
              description: `Row length: ${group.row_length_ft.toFixed(1)} ft, ${group.lineal_feet.toFixed(0)} lf striping`,
              quantity: group.stall_count,
              unit_price: 0
            });
          });
        }
        // Default: standard area measurement
        else {
          calculatorItems.push({
            service_id: "",
            service_name: `Area Measurement: ${quoteData.totalArea.toFixed(0)} sq ft`,
            description: `Total Area: ${quoteData.totalArea.toFixed(0)} sq ft, Perimeter: ${quoteData.totalPerimeter.toFixed(0)} ft${quoteData.notes ? ` - Notes: ${quoteData.notes}` : ''}`,
            quantity: Math.ceil(quoteData.totalArea),
            unit_price: 0
          });

          if (quoteData.shapes && quoteData.shapes.length > 1) {
            quoteData.shapes.forEach((shape, idx) => {
              calculatorItems.push({
                service_id: "",
                service_name: `Area ${idx + 1}: ${shape.area.toFixed(0)} sq ft`,
                description: `Shape ${idx + 1}: ${shape.area.toFixed(0)} sq ft, Perimeter: ${shape.perimeter.toFixed(0)} ft`,
                quantity: Math.ceil(shape.area),
                unit_price: 0
              });
            });
          }
        }

        sessionStorage.setItem("calculatorItems", JSON.stringify(calculatorItems));
        sessionStorage.setItem("areaBidProData", JSON.stringify(quoteData));
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  function goToEstimates() {
    router.push('/estimates');
  }

  return (
    <div
      className="fixed top-14 md:top-16 right-0 bottom-0 flex flex-col bg-gray-50 transition-all duration-300"
      style={{ left: isClient ? sidebarWidth : '256px' }}
    >
      {/* Success Banner */}
      {showBanner && receivedData && (
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-3 flex justify-between items-center gap-4 shadow-lg z-10">
          <div className="text-sm">
            <strong>Measurement Received!</strong>{' '}
            {receivedData.concrete ? (
              <>
                {receivedData.totalArea.toFixed(0)} sq ft concrete, {receivedData.concrete.totalCubicYards.toFixed(2)} yd³
                {receivedData.concrete.slabs.length > 0 && ` (${receivedData.concrete.slabs.length} slab${receivedData.concrete.slabs.length > 1 ? 's' : ''})`}
              </>
            ) : receivedData.stallGroups && receivedData.stallGroups.length > 0 ? (
              <>
                {receivedData.stallGroups.reduce((sum, g) => sum + g.stall_count, 0)} stalls, {receivedData.stallGroups.reduce((sum, g) => sum + g.lineal_feet, 0).toFixed(0)} lf striping
              </>
            ) : (
              <>
                {receivedData.totalArea.toFixed(0)} sq ft, {receivedData.totalPerimeter.toFixed(0)} ft perimeter
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={goToEstimates}
              className="bg-white text-emerald-600 px-4 py-2 rounded-md font-semibold text-sm hover:bg-emerald-50 transition"
            >
              Create Estimate →
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="bg-white/20 text-white px-3 py-2 rounded-md text-sm hover:bg-white/30 transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Iframe */}
      <div className="flex-1 min-h-0">
        <iframe
          src="https://area-bid-helper.vercel.app"
          className="w-full h-full border-0"
          title="Area Bid Helper"
          allow="geolocation"
        />
      </div>
    </div>
  );
}
