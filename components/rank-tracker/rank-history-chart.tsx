"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface RankHistoryData {
  id: string;
  keyword: string;
  created_at: string;
  best_rank: number | null;
  average_rank: number | null;
}

interface RankHistoryChartProps {
  data: RankHistoryData[];
  keyword?: string;
}

export function RankHistoryChart({ data, keyword }: RankHistoryChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Andamento Posizionamento</CardTitle>
          <CardDescription>
            {keyword ? `Storico per "${keyword}"` : "Nessuno storico disponibile"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-2 opacity-50" />
            <p>Nessun dato storico disponibile</p>
            <p className="text-sm">Effettua più scansioni per visualizzare il grafico</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepara i dati per il grafico
  const chartData = data.map((item) => ({
    date: format(new Date(item.created_at), "dd MMM", { locale: it }),
    fullDate: format(new Date(item.created_at), "dd MMMM yyyy - HH:mm", { locale: it }),
    bestRank: item.best_rank,
    averageRank: item.average_rank ? Number(item.average_rank.toFixed(1)) : null,
  }));

  // Calcola il trend (confronta prima e ultima scansione)
  const firstBest = data[0]?.best_rank;
  const lastBest = data[data.length - 1]?.best_rank;
  let trend: "up" | "down" | "stable" = "stable";
  let trendValue = 0;

  if (firstBest && lastBest) {
    trendValue = firstBest - lastBest;
    if (trendValue > 0) trend = "up"; // Miglioramento (da 20 a 10 = +10)
    else if (trendValue < 0) trend = "down"; // Peggioramento (da 10 a 20 = -10)
  }

  // Trova il range dei valori per settare i limiti dell'asse Y
  const allRanks = data.flatMap((item) => [item.best_rank, item.average_rank]).filter((r): r is number => r !== null);
  const minRank = Math.min(...allRanks);
  const maxRank = Math.max(...allRanks);

  // Aggiungi margine per migliore visualizzazione
  const yAxisMin = Math.max(1, Math.floor(minRank - 2));
  const yAxisMax = Math.ceil(maxRank + 2);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Andamento Posizionamento</CardTitle>
            <CardDescription>
              {keyword ? `Storico per "${keyword}" - ${data.length} scansioni` : `${data.length} scansioni totali`}
            </CardDescription>
          </div>
          {firstBest && lastBest && (
            <div className="flex items-center gap-2">
              {trend === "up" && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">+{trendValue} posizioni</span>
                </div>
              )}
              {trend === "down" && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <TrendingDown className="h-4 w-4" />
                  <span className="font-medium">{trendValue} posizioni</span>
                </div>
              )}
              {trend === "stable" && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Minus className="h-4 w-4" />
                  <span>Stabile</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              reversed={true}
              domain={[yAxisMin, yAxisMax]}
              label={{
                value: "Posizione",
                angle: -90,
                position: "insideLeft",
                style: { fill: "hsl(var(--muted-foreground))" }
              }}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              formatter={(value: any, name: string) => {
                if (name === "bestRank") return [value, "Miglior Posizione"];
                if (name === "averageRank") return [value, "Posizione Media"];
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullDate;
                }
                return label;
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => {
                if (value === "bestRank") return "Miglior Posizione";
                if (value === "averageRank") return "Posizione Media";
                return value;
              }}
            />
            <Line
              type="monotone"
              dataKey="bestRank"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
              name="bestRank"
            />
            <Line
              type="monotone"
              dataKey="averageRank"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "hsl(var(--muted-foreground))", r: 3 }}
              name="averageRank"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
