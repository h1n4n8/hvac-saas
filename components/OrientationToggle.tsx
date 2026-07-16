"use client";

export type Orientation = "portrait" | "landscape";

// Small segmented control for choosing the print/PDF page orientation.
// The chosen value drives an `orient-portrait` / `orient-landscape` class on
// the print container, which selects the matching @page rule at print time.
export default function OrientationToggle({
  value,
  onChange,
}: {
  value: Orientation;
  onChange: (o: Orientation) => void;
}) {
  const opts: { key: Orientation; label: string }[] = [
    { key: "portrait", label: "縦" },
    { key: "landscape", label: "横" },
  ];
  return (
    <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden text-sm">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-2.5 font-medium transition-colors ${
            value === o.key ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
          }`}
          aria-pressed={value === o.key}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
