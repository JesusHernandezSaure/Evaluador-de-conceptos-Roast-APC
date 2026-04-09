import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ScorecardItem } from '../types';

interface Props {
  data: ScorecardItem[];
}

export default function ScorecardChart({ data }: Props) {
  const chartData = data.map((item) => ({
    subject: item.category,
    A: item.score,
    fullMark: 5,
  }));

  return (
    <div className="w-full h-[400px] bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#ffffff20" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#ffffff80', fontSize: 10 }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
          <Radar
            name="Calificación"
            dataKey="A"
            stroke="#f97316"
            fill="#f97316"
            fillOpacity={0.6}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
