"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";
import { colors, difficultyColors } from "@techrat/theme";
import { useFormat, useT } from "@/i18n";

const axis = { stroke: colors.textMuted, fontSize: 12, tickLine: false, axisLine: false } as const;
const tooltipStyle = {
  contentStyle: { background: colors.cardRaised, border: `1px solid ${colors.border}`, borderRadius: 12, color: colors.text },
  labelStyle: { color: colors.textSecondary },
  cursor: { fill: "rgba(255,255,255,0.03)" },
};

export function AccuracyByDifficultyChart({ data }: { data: { difficulty: string; accuracy: number; answered: number }[] }) {
  const t = useT();
  const difficultyLabel = (d: unknown) => t.common.difficulty[String(d)] ?? String(d);
  return (
    <div className="h-64" role="img" aria-label={t.charts.accuracyByDifficulty(data.map((d) => `${difficultyLabel(d.difficulty)} ${Math.round(d.accuracy)}%`).join(", "))}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 24, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={colors.borderSubtle} />
          <XAxis dataKey="difficulty" tickFormatter={difficultyLabel} {...axis} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} {...axis} />
          <Tooltip {...tooltipStyle} labelFormatter={difficultyLabel} formatter={(v, _n, item) => [t.charts.accuracyValue(Math.round(Number(v)), (item?.payload as { answered: number }).answered), t.charts.accuracy]} />
          <Bar dataKey="accuracy" radius={[8, 8, 0, 0]} maxBarSize={56}>
            {data.map((d) => <Cell key={d.difficulty} fill={difficultyColors[d.difficulty as keyof typeof difficultyColors] ?? colors.primary} />)}
            <LabelList dataKey="accuracy" position="top" formatter={(v) => `${Math.round(Number(v))}%`} fill={colors.text} fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityChart({ data, dataKey, label }: { data: { date: string; [k: string]: number | string }[]; dataKey: string; label: string }) {
  const t = useT();
  const f = useFormat();
  const formatted = data.map((d) => ({ ...d, day: f.date(`${d.date}T00:00:00Z`, { month: "short", day: "numeric", timeZone: "UTC" }) }));
  return (
    <div className="h-56" role="img" aria-label={t.charts.overLastDays(label, data.length)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={colors.borderSubtle} />
          <XAxis dataKey="day" {...axis} interval="preserveStartEnd" minTickGap={24} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip {...tooltipStyle} formatter={(v) => [v, label]} />
          <Area type="monotone" dataKey={dataKey} stroke={colors.primary} strokeWidth={2} fill={`url(#fill-${dataKey})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
