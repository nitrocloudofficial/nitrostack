"use client";

import { useState } from "react";

export interface BusinessFormData {
  businessType: string;
  city: string;
  budget: number;
  radius: number;
}

interface BusinessFormProps {
  onAnalyze: (data: BusinessFormData) => void;
}

export default function BusinessForm({ onAnalyze }: BusinessFormProps) {
  const [businessType, setBusinessType] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [radius, setRadius] = useState("5");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    onAnalyze({
      businessType,
      city,
      budget: Number(budget),
      radius: Number(radius),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Business Type */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Business Type
        </label>

        <input
          type="text"
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          placeholder="e.g. Coffee Shop"
          required
          className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
        />
      </div>

      {/* City */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          City / Location
        </label>

        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Coimbatore"
          required
          className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
        />
      </div>

      {/* Budget + Radius */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Budget
          </label>

          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="₹ Amount"
            min="0"
            required
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Radius (km)
          </label>

          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            min="1"
            max="50"
            required
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-green-600 px-5 py-3.5 font-semibold text-white shadow-sm shadow-green-600/20 transition hover:bg-green-700 hover:shadow-md active:scale-[0.99]"
      >
        Analyze Location
      </button>
    </form>
  );
}
