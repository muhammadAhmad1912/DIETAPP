import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';
import { format, parseISO } from 'date-fns';
import { AppText } from '@/components/ui/AppText';

interface Point {
  date: string;
  value: number;
}

interface LineChartProps {
  data: Point[];
  height?: number;
  color?: string;
  unit?: string;
  emptyLabel?: string;
}

export function LineChart({
  data,
  height = 180,
  color,
  unit = '',
  emptyLabel = 'Not enough data yet',
}: LineChartProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.primary;
  const width = 320;
  const padding = 28;

  if (data.length < 2) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <AppText muted>{emptyLabel}</AppText>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values) * 0.98;
  const max = Math.max(...values) * 1.02;
  const range = Math.max(max - min, 1);

  const points = data.map((d, i) => {
    const x =
      padding + (i * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const y = padding + ((max - d.value) / range) * (height - padding * 2);
    return { x, y, ...d };
  });

  // Smooth cubic bezier through points for a premium chart feel
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stroke} stopOpacity="0.28" />
          <Stop offset="1" stopColor={stroke} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill="url(#lineFill)" />
      <Path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p) => (
        <Circle
          key={p.date}
          cx={p.x}
          cy={p.y}
          r={4.5}
          fill={colors.surface}
          stroke={stroke}
          strokeWidth={2.5}
        />
      ))}
      {points.map((p, i) =>
        i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2) ? (
          <SvgText
            key={`label-${p.date}`}
            x={p.x}
            y={height - 8}
            fontSize="10"
            fill={colors.textSecondary}
            textAnchor="middle"
            fontWeight="600"
          >
            {format(parseISO(p.date), 'MMM d')}
          </SvgText>
        ) : null,
      )}
      <SvgText x={padding} y={16} fontSize="11" fill={stroke} fontWeight="700">
        {`${max.toFixed(1)}${unit}`}
      </SvgText>
    </Svg>
  );
}
