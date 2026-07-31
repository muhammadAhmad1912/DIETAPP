import React, { useId, useMemo } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
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
  /** Optional projected point drawn as a dashed extension. */
  forecast?: Point | null;
}

export function LineChart({
  data,
  height = 200,
  color,
  unit = '',
  emptyLabel = 'Not enough data yet',
  forecast = null,
}: LineChartProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.primary;
  const gradId = `lineFill-${useId().replace(/:/g, '')}`;
  const width = 320;
  const padL = 36;
  const padR = 16;
  const padT = 22;
  const padB = 28;

  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const allValues = [
      ...data.map((d) => d.value),
      ...(forecast ? [forecast.value] : []),
    ];
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const pad = Math.max((rawMax - rawMin) * 0.12, 0.3);
    const min = rawMin - pad;
    const max = rawMax + pad;
    const range = Math.max(max - min, 0.1);

    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const totalSlots = data.length - 1 + (forecast ? 1 : 0);

    const toPoint = (value: number, index: number) => ({
      x: padL + (index * plotW) / Math.max(totalSlots, 1),
      y: padT + ((max - value) / range) * plotH,
    });

    const points = data.map((d, i) => ({ ...d, ...toPoint(d.value, i) }));
    const forecastPoint = forecast
      ? {
          ...forecast,
          ...toPoint(forecast.value, data.length),
        }
      : null;

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

    const last = points[points.length - 1];
    const areaPath = `${linePath} L ${last.x} ${height - padB} L ${points[0].x} ${height - padB} Z`;

    const yTicks = [max, (max + min) / 2, min];
    const labelIndexes = new Set(
      [0, Math.floor((points.length - 1) / 2), points.length - 1].filter(
        (i) => i >= 0,
      ),
    );

    return {
      points,
      forecastPoint,
      linePath,
      areaPath,
      yTicks,
      labelIndexes,
      min,
      max,
      last,
    };
  }, [data, forecast, height]);

  if (!chart) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <AppText muted>{emptyLabel}</AppText>
      </View>
    );
  }

  const {
    points,
    forecastPoint,
    linePath,
    areaPath,
    yTicks,
    labelIndexes,
    last,
  } = chart;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stroke} stopOpacity="0.22" />
          <Stop offset="1" stopColor={stroke} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>

      {yTicks.map((tick, i) => {
        const y =
          padT +
          ((chart.max - tick) / Math.max(chart.max - chart.min, 0.1)) *
            (height - padT - padB);
        return (
          <React.Fragment key={`grid-${i}`}>
            <Line
              x1={padL}
              y1={y}
              x2={width - padR}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray={i === 1 ? '4 4' : undefined}
              opacity={0.85}
            />
            <SvgText
              x={padL - 6}
              y={y + 3}
              fontSize="10"
              fill={colors.textSecondary}
              textAnchor="end"
              fontWeight="600"
            >
              {tick.toFixed(1)}
            </SvgText>
          </React.Fragment>
        );
      })}

      <Path d={areaPath} fill={`url(#${gradId})`} />
      <Path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={2.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {forecastPoint ? (
        <>
          <Line
            x1={last.x}
            y1={last.y}
            x2={forecastPoint.x}
            y2={forecastPoint.y}
            stroke={stroke}
            strokeWidth={2}
            strokeDasharray="6 5"
            strokeLinecap="round"
            opacity={0.75}
          />
          <Circle
            cx={forecastPoint.x}
            cy={forecastPoint.y}
            r={5}
            fill={colors.surface}
            stroke={stroke}
            strokeWidth={2}
            strokeDasharray="3 2"
          />
          <SvgText
            x={forecastPoint.x}
            y={Math.max(padT + 10, forecastPoint.y - 10)}
            fontSize="10"
            fill={stroke}
            textAnchor="middle"
            fontWeight="700"
          >
            {`${forecastPoint.value.toFixed(1)}${unit}`}
          </SvgText>
          <SvgText
            x={forecastPoint.x}
            y={height - 8}
            fontSize="10"
            fill={colors.textSecondary}
            textAnchor="middle"
            fontWeight="600"
          >
            {format(parseISO(forecastPoint.date), 'MMM d')}
          </SvgText>
        </>
      ) : null}

      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        return (
          <Circle
            key={`point-${i}-${p.date}`}
            cx={p.x}
            cy={p.y}
            r={isLast ? 5.5 : 3.5}
            fill={isLast ? stroke : colors.surface}
            stroke={stroke}
            strokeWidth={isLast ? 0 : 2}
          />
        );
      })}

      {points.map((p, i) =>
        labelIndexes.has(i) ? (
          <SvgText
            key={`label-${i}-${p.date}`}
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
    </Svg>
  );
}
