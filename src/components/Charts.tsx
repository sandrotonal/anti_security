// Severity Distribution Chart Component
// Lightweight visualization for scan results

import { useMemo } from 'react';

interface ChartProps {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export const SeverityChart = ({ critical, high, medium, low }: ChartProps) => {
  const total = critical + high + medium + low;
  
  const percentages = useMemo(() => ({
    critical: total > 0 ? (critical / total) * 100 : 0,
    high: total > 0 ? (high / total) * 100 : 0,
    medium: total > 0 ? (medium / total) * 100 : 0,
    low: total > 0 ? (low / total) * 100 : 0,
  }), [critical, high, medium, low, total]);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-neutral-500 text-sm font-mono">
        no findings to display
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bar Chart */}
      <div className="flex gap-1 h-8 rounded-lg overflow-hidden bg-neutral-900/50">
        {critical > 0 && (
          <div
            className="bg-red-500/80 hover:bg-red-500 transition-colors relative group"
            style={{ width: `${percentages.critical}%` }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              {critical}
            </div>
          </div>
        )}
        {high > 0 && (
          <div
            className="bg-orange-500/80 hover:bg-orange-500 transition-colors relative group"
            style={{ width: `${percentages.high}%` }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              {high}
            </div>
          </div>
        )}
        {medium > 0 && (
          <div
            className="bg-yellow-500/80 hover:bg-yellow-500 transition-colors relative group"
            style={{ width: `${percentages.medium}%` }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              {medium}
            </div>
          </div>
        )}
        {low > 0 && (
          <div
            className="bg-blue-500/80 hover:bg-blue-500 transition-colors relative group"
            style={{ width: `${percentages.low}%` }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              {low}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-4 gap-2 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500/80"></div>
          <span className="text-neutral-400">critical</span>
          <span className="text-white ml-auto">{critical}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-500/80"></div>
          <span className="text-neutral-400">high</span>
          <span className="text-white ml-auto">{high}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-yellow-500/80"></div>
          <span className="text-neutral-400">medium</span>
          <span className="text-white ml-auto">{medium}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-500/80"></div>
          <span className="text-neutral-400">low</span>
          <span className="text-white ml-auto">{low}</span>
        </div>
      </div>
    </div>
  );
};

// File Heatmap Component
interface HeatmapItem {
  file: string;
  count: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface HeatmapProps {
  data: HeatmapItem[];
  maxItems?: number;
}

export const FileHeatmap = ({ data, maxItems = 10 }: HeatmapProps) => {
  const topFiles = useMemo(() => 
    data.slice(0, maxItems),
    [data, maxItems]
  );

  if (topFiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-neutral-500 text-sm font-mono">
        no files to display
      </div>
    );
  }

  const maxCount = Math.max(...topFiles.map(f => f.count));

  return (
    <div className="space-y-2">
      {topFiles.map((item, idx) => {
        const percentage = (item.count / maxCount) * 100;
        const fileName = item.file.split('/').pop() || item.file;
        
        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-300 truncate" title={item.file}>
                {fileName}
              </span>
              <span className="text-neutral-500 ml-2">{item.count}</span>
            </div>
            <div className="relative h-6 bg-neutral-900/50 rounded overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500/40 via-orange-500/40 to-yellow-500/40 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              ></div>
              <div className="absolute inset-0 flex items-center px-2 gap-1 text-[10px] font-mono">
                {item.critical > 0 && (
                  <span className="text-red-400">C:{item.critical}</span>
                )}
                {item.high > 0 && (
                  <span className="text-orange-400">H:{item.high}</span>
                )}
                {item.medium > 0 && (
                  <span className="text-yellow-400">M:{item.medium}</span>
                )}
                {item.low > 0 && (
                  <span className="text-blue-400">L:{item.low}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Donut Chart Component for Summary
interface DonutChartProps {
  critical: number;
  high: number;
  medium: number;
  low: number;
  size?: number;
}

export const DonutChart = ({ critical, high, medium, low, size = 120 }: DonutChartProps) => {
  const total = critical + high + medium + low;
  
  if (total === 0) {
    return (
      <div 
        className="flex items-center justify-center rounded-full bg-neutral-900/50 text-neutral-500 text-xs font-mono"
        style={{ width: size, height: size }}
      >
        no data
      </div>
    );
  }

  const circumference = 2 * Math.PI * 40;
  const criticalOffset = 0;
  const criticalLength = (critical / total) * circumference;
  const highOffset = criticalLength;
  const highLength = (high / total) * circumference;
  const mediumOffset = highOffset + highLength;
  const mediumLength = (medium / total) * circumference;
  const lowOffset = mediumOffset + mediumLength;
  const lowLength = (low / total) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" className="transform -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="12"
        />
        {critical > 0 && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#ef4444"
            strokeWidth="12"
            strokeDasharray={`${criticalLength} ${circumference}`}
            strokeDashoffset={-criticalOffset}
            className="transition-all duration-300"
          />
        )}
        {high > 0 && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#f97316"
            strokeWidth="12"
            strokeDasharray={`${highLength} ${circumference}`}
            strokeDashoffset={-highOffset}
            className="transition-all duration-300"
          />
        )}
        {medium > 0 && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#eab308"
            strokeWidth="12"
            strokeDasharray={`${mediumLength} ${circumference}`}
            strokeDashoffset={-mediumOffset}
            className="transition-all duration-300"
          />
        )}
        {low > 0 && (
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="12"
            strokeDasharray={`${lowLength} ${circumference}`}
            strokeDashoffset={-lowOffset}
            className="transition-all duration-300"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-white font-mono">{total}</div>
        <div className="text-[10px] text-neutral-500 font-mono">findings</div>
      </div>
    </div>
  );
};
