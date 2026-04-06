"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, History, LogOut, Wallet } from "lucide-react";
import { deleteCookie } from "cookies-next";
import { useRouter, useParams } from "next/navigation";

export default function CustomerDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { tenant } = useParams();

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get("/me");
        setData(res.data);
      } catch (err) {
        router.push(`/${tenant}/login`);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [tenant, router]);

  const handleLogout = () => {
    deleteCookie("auth_token");
    router.push(`/${tenant}/login`);
  };

  if (loading)
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-20">
      {/* Header Profile */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Halo, {data.customer.name}!</h1>
          <p className="text-muted-foreground text-sm">{data.customer.phone}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy size={24} />
            <div>
              <p className="text-xs opacity-80">Tier</p>
              <p className="font-bold">{data.customer.tier}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className="text-orange-500" size={24} />
            <div>
              <p className="text-xs text-muted-foreground">Poin Sultan</p>
              <p className="font-bold">{data.points} pts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hidden md:block">
          <CardContent className="p-4 flex items-center gap-3">
            <History className="text-blue-500" size={24} />
            <div>
              <p className="text-xs text-muted-foreground">Kunjungan</p>
              <p className="font-bold">{data.customer.total_visits}x</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Riwayat Transaksi Terakhir */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History size={18} />
            Riwayat Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent_history?.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.resource}</TableCell>
                  <TableCell>
                    {new Date(h.date).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell>Rp {h.total_spent.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        h.status === "completed" ? "default" : "secondary"
                      }
                    >
                      {h.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {data.recent_history?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Belum ada transaksi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
