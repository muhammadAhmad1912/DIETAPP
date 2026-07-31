import React from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { format, parseISO } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import { AppText } from '@/components/ui/AppText';

interface BarPoint {
  date: string;
  value: number;
}

interface BarChartProps {
  data: BarPoint[];
  height?: number;
  color?: string;
  goal?: number;
}

export function BarChart({ data, height = 180, color, goal }: BarChartProps) {
  const { colors } = useTheme();
  const fill = color ?? colors.primary;
  const width = 320;
  const padding = 28;

  if (!data.length) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <AppText muted>No data yet</AppText>
      </View>
    );
  }

  const max = Math.max(...data.map((d) => d.value), goal ?? 0, 1);
  const slot = (width - padding * 2) / data.length;
  const barWidth = Math.max(slot - 10, 12);

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={fill} stopOpacity="1" />
          <Stop offset="1" stopColor={fill} stopOpacity="0.55" />
        </LinearGradient>
      </Defs>
      {goal ? (
        <Rect
          x={padding}
          y={padding + ((max - goal) / max) * (height - padding * 2)}
          width={width - padding * 2}
          height={2}
          rx={1}
          fill={colors.primary}
          opacity={0.35}
        />
      ) : null}
      {data.map((d, i) => {
        const h = (d.value / max) * (height - padding * 2);
        const x = padding + i * slot + (slot - barWidth) / 2;
        const y = height - padding - h;
        return (
          <React.Fragment key={`bar-${i}-${d.date}`}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(h, 4)}
              rx={8}
              fill="url(#barGrad)"
            />
            <SvgText
              x={x + barWidth / 2}
              y={height - 8}
              fontSize="10"
              fill={colors.textSecondary}
              textAnchor="middle"
              fontWeight="600"
            >
              {format(parseISO(d.date), 'EEEEE')}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}
