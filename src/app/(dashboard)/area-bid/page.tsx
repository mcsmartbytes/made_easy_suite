'use client';

import { useState } from 'react';
import { Calculator, Plus, Trash2, Copy, Send } from 'lucide-react';

interface AreaItem {
  id: number;
  name: string;
  length: number;
  width: number;
  sqft: number;
  pricePerSqft: number;
  total: number;
}

export default function AreaBidPage() {
  const [items, setItems] = useState<AreaItem[]>([
    { id: 1, name: 'Main Parking Lot', length: 200, width: 150, sqft: 30000, pricePerSqft: 0.18, total: 5400 },
    { id: 2, name: 'Side Lot A', length: 80, width: 60, sqft: 4800, pricePerSqft: 0.20, total: 960 },
  ]);

  const [newItem, setNewItem] = useState({ name: '', length: 0, width: 0, pricePerSqft: 0.18 });

  const addItem = () => {
    if (!newItem.name || !newItem.length || !newItem.width) return;
    const sqft = newItem.length * newItem.width;
    const total = sqft * newItem.pricePerSqft;
    setItems([...items, {
      id: Date.now(),
      name: newItem.name,
      length: newItem.length,
      width: newItem.width,
      sqft,
      pricePerSqft: newItem.pricePerSqft,
      total,
    }]);
    setNewItem({ name: '', length: 0, width: 0, pricePerSqft: 0.18 });
  };

  const removeItem = (id: number) => {
    setItems(items.filter(i => i.id !== id));
  };

  const totalSqft = items.reduce((sum, i) => sum + i.sqft, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Area Bid Calculator</h1>
          <p className="text-gray-600">Calculate pricing based on square footage</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2">
            <Copy className="w-4 h-4" /> Copy to Estimate
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2">
            <Send className="w-4 h-4" /> Create Quote
          </button>
        </div>
      </div>

      {/* Calculator */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Areas List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {item.length} ft × {item.width} ft = {item.sqft.toLocaleString()} sq ft
                  </p>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-gray-600">${item.pricePerSqft.toFixed(2)} / sq ft</span>
                <span className="text-xl font-bold text-gray-900">${item.total.toLocaleString()}</span>
              </div>
            </div>
          ))}

          {/* Add New Area */}
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-5">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add Area
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Area name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Length (ft)</label>
                <input
                  type="number"
                  value={newItem.length || ''}
                  onChange={(e) => setNewItem({ ...newItem, length: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Width (ft)</label>
                <input
                  type="number"
                  value={newItem.width || ''}
                  onChange={(e) => setNewItem({ ...newItem, width: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">$/sq ft</label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.pricePerSqft}
                  onChange={(e) => setNewItem({ ...newItem, pricePerSqft: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <button
              onClick={addItem}
              className="mt-4 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium"
            >
              Add Area
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Quote Summary</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Areas</span>
              <span className="font-medium text-gray-900">{items.length}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Sq Ft</span>
              <span className="font-medium text-gray-900">{totalSqft.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Avg Price/Sq Ft</span>
              <span className="font-medium text-gray-900">
                ${totalSqft > 0 ? (totalPrice / totalSqft).toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="flex justify-between py-4 bg-blue-50 rounded-lg px-4 -mx-2">
              <span className="font-semibold text-gray-900">Total Quote</span>
              <span className="text-2xl font-bold text-blue-600">${totalPrice.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium">
              Create Estimate
            </button>
            <button className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 rounded-lg font-medium">
              Save as Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
