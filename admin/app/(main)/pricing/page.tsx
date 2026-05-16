"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { DollarSign, Save, Info } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function PricingPage() {
  const { data: pricing, mutate } = useSWR("/admin/pricing", fetcher);
  const [form, setForm] = useState({
    base_fare: 3.0,
    rate_per_km: 1.5,
    surge_multiplier: 1.5,
    min_fare: 4.0,
    ebike_premium: 0.1,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pricing) setForm(pricing);
  }, [pricing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch("/admin/pricing", form);
      mutate();
      toast.success("Pricing updated!");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: "base_fare", label: "Base Fare", unit: "€", hint: "Fixed charge per ride" },
    { key: "rate_per_km", label: "Rate per km", unit: "€/km", hint: "Variable distance charge" },
    { key: "surge_multiplier", label: "Surge Multiplier", unit: "×", hint: "Applied nights & weekends" },
    { key: "min_fare", label: "Minimum Fare", unit: "€", hint: "Floor price regardless of distance" },
    { key: "ebike_premium", label: "E-Bike Premium", unit: "%", hint: "Extra charge for electric bikes" },
  ] as const;

  return (
    <div className="p-6 max-w-lg">
      <PageHeader title="Pricing Configuration" subtitle="Changes apply immediately to all new rides" />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100 mt-6">
        {fields.map(({ key, label, unit, hint }) => (
          <div key={key} className="p-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-900">{label}</label>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Info size={11} />
                <span>{hint}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-sm text-gray-500 w-10">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-xl p-4 mt-4 text-sm">
        <p className="font-medium text-gray-700 mb-2">Preview: 3 km standard ride, no surge</p>
        <div className="space-y-1 text-gray-600">
          <div className="flex justify-between"><span>Base fare</span><span>€{form.base_fare.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Distance (3 km)</span><span>€{(3 * form.rate_per_km).toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
            <span>Total</span>
            <span>€{Math.max(form.base_fare + 3 * form.rate_per_km, form.min_fare).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 w-full bg-primary text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Save size={16} />
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}
