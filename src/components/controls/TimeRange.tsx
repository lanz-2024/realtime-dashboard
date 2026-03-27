"use client";

const RANGES = [
	{ label: "1m", value: "1m" },
	{ label: "5m", value: "5m" },
	{ label: "15m", value: "15m" },
	{ label: "1h", value: "1h" },
];

export function TimeRange({
	value,
	onChange,
}: {
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
			{RANGES.map((r) => (
				<button
					type="button"
					key={r.value}
					onClick={() => onChange(r.value)}
					className={`px-3 py-1 rounded-md text-sm transition-colors ${
						value === r.value
							? "bg-gray-700 text-white"
							: "text-gray-400 hover:text-white"
					}`}
				>
					{r.label}
				</button>
			))}
		</div>
	);
}
