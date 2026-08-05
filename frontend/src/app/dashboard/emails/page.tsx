"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, RefreshCw, SendHorizonal, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdminHeader,
  StatCard,
  StatusPill,
  SectionCard,
  EmptyState,
} from "@/components/platform/admin-kit";
import { getPlatformEmailLogsPage, sendPlatformEmail, type PlatformEmailLog } from "@/lib/platform-admin";

const DEFAULT_HTML = "<h1>Bookinaja</h1><p>Email test dari platform admin.</p>";
const DEFAULT_TEXT = "Bookinaja - email test dari platform admin.";

function emailStatusTone(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "accepted" || s === "sent" || s === "delivered") return "active";
  if (s === "queued" || s === "pending") return "trial";
  if (s === "failed" || s === "bounced") return "suspended";
  return "neutral";
}

export default function PlatformEmailsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [data, setData] = useState<{
    items: PlatformEmailLog[];
    total: number;
    page: number;
    page_size: number;
  }>({ items: [], total: 0, page: 1, page_size: 25 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("Bookinaja email smoke test");
  const [eventKey, setEventKey] = useState("platform_manual");
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [text, setText] = useState(DEFAULT_TEXT);

  const loadLogs = () => {
    setLoading(true);
    return getPlatformEmailLogsPage({
      page,
      pageSize,
      eventKey: eventFilter,
      status: statusFilter,
      q: appliedQuery,
    })
      .then((res) => {
        setData({
          items: Array.isArray(res?.items) ? res.items : [],
          total: Number(res?.total || 0),
          page: Number(res?.page || 1),
          page_size: Number(res?.page_size || pageSize),
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedQuery, page, pageSize, eventFilter, statusFilter]);

  const items = useMemo(() => (Array.isArray(data.items) ? data.items : []), [data.items]);

  const eventOptions = useMemo(() => {
    const values = new Set<string>();
    items.forEach((item) => {
      if (item.event_key) values.add(item.event_key);
    });
    return Array.from(values);
  }, [items]);

  const totalPages = Math.max(Math.ceil((data.total || 0) / pageSize), 1);

  async function handleSend() {
    if (!recipient.trim()) {
      setFeedback("Recipient wajib diisi.");
      return;
    }
    setSending(true);
    setFeedback(null);
    try {
      const res = await sendPlatformEmail({
        to: [recipient.trim()],
        subject: subject.trim(),
        html,
        text,
        event_key: eventKey.trim() || "platform_manual",
        source: "platform_admin",
        tags: { source: "platform_admin", purpose: "manual_send" },
      });
      setFeedback(`Email queued: ${res.data?.email_id || "ok"}`);
      setPage(1);
      await loadLogs();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Email belum berhasil dikirim.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-6">
      <AdminHeader
        title="Email"
        subtitle="Log email programatik dan smoke test pengiriman."
        actions={
          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void loadLogs()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total log" value={data.total.toLocaleString("id-ID")} icon={Inbox} loading={loading} />
        <StatCard label="Halaman" value={`${page} / ${totalPages}`} />
        <StatCard label="Event key" value={String(eventOptions.length)} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Manual send */}
        <SectionCard title="Kirim manual">
          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <SendHorizonal className="h-4 w-4" />
              Smoke test
            </div>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="recipient@email.com"
              className="h-10 rounded-lg"
            />
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="h-10 rounded-lg"
            />
            <Input
              value={eventKey}
              onChange={(e) => setEventKey(e.target.value)}
              placeholder="event key, mis. onboarding"
              className="h-10 rounded-lg"
            />
            <Textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="min-h-24 rounded-lg"
              placeholder="HTML content"
            />
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-16 rounded-lg"
              placeholder="Plain text content"
            />
            <Button className="rounded-lg" disabled={sending} onClick={handleSend}>
              <Mail className="mr-1.5 h-4 w-4" />
              {sending ? "Mengirim…" : "Kirim email"}
            </Button>
            {feedback ? (
              <div className="rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                {feedback}
              </div>
            ) : null}
          </div>
        </SectionCard>

        {/* Logs */}
        <SectionCard bodyClassName="p-0">
          <div className="flex flex-col gap-2 border-b border-[var(--admin-line-soft)] p-3 sm:flex-row">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setAppliedQuery(query.trim());
                }
              }}
              placeholder="Cari recipient, subject, event…"
              className="h-10 flex-1 rounded-lg"
            />
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="h-10 w-36 rounded-lg">
                <SelectValue placeholder="Event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua event</SelectItem>
                {eventOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-32 rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-slate-400">Memuat log…</div>
          ) : items.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Inbox} title="Belum ada log email" />
            </div>
          ) : (
            <Table className="rounded-none border-0 bg-transparent shadow-none">
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {item.subject || "(no subject)"}
                      </div>
                      {item.error_message ? (
                        <div className="text-xs text-rose-500">{item.error_message}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">
                      {item.recipient}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{item.event_key}</TableCell>
                    <TableCell>
                      <StatusPill status={emailStatusTone(item.status)} label={item.status} />
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-400">
                      {item.sent_at || item.created_at
                        ? new Date(item.sent_at || item.created_at).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex items-center justify-between border-t border-[var(--admin-line-soft)] p-3">
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="h-9 w-28 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 baris</SelectItem>
                <SelectItem value="25">25 baris</SelectItem>
                <SelectItem value="50">50 baris</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => setPage((v) => Math.max(1, v - 1))}
                disabled={page <= 1}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
