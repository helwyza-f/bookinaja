"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, RefreshCw, SendHorizonal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/dashboard/page-shell";
import { getPlatformEmailLogsPage, sendPlatformEmail, type PlatformEmailLog } from "@/lib/platform-admin";

const DEFAULT_HTML = "<h1>Bookinaja</h1><p>Email test dari platform admin.</p>";
const DEFAULT_TEXT = "Bookinaja - email test dari platform admin.";

export default function PlatformEmailsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [data, setData] = useState<{ items: PlatformEmailLog[]; total: number; page: number; page_size: number }>({
    items: [],
    total: 0,
    page: 1,
    page_size: 25,
  });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("Bookinaja email smoke test");
  const [eventKey, setEventKey] = useState("platform_manual");
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [text, setText] = useState(DEFAULT_TEXT);

  const loadLogs = () =>
    getPlatformEmailLogsPage({
      page,
      pageSize,
      eventKey: eventFilter,
      status: statusFilter,
      q: appliedQuery,
    }).then(setData);

  useEffect(() => {
    void getPlatformEmailLogsPage({
      page,
      pageSize,
      eventKey: eventFilter,
      status: statusFilter,
      q: appliedQuery,
    }).then(setData);
  }, [appliedQuery, page, pageSize, eventFilter, statusFilter]);

  const eventOptions = useMemo(() => {
    const values = new Set<string>();
    data.items.forEach((item) => {
      if (item.event_key) values.add(item.event_key);
    });
    return Array.from(values);
  }, [data.items]);

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
        tags: {
          source: "platform_admin",
          purpose: "manual_send",
        },
      });
      setFeedback(`Email queued: ${res.data?.email_id || "ok"}`);
      setPage(1);
      await loadLogs();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Email belum berhasil dikirim.";
      setFeedback(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <PageShell
      eyebrow="Email operations"
      title="Programmatic email logs"
      description="Pantau semua email yang dikirim aplikasi, kelompokkan per event, dan pakai halaman ini untuk smoke test sebelum flow onboarding atau reset password dihidupkan."
      actions={
        <Button variant="outline" className="rounded-2xl" onClick={() => void loadLogs()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
      stats={[
        { label: "Logs", value: `${data.total}` },
        { label: "Page", value: `${page} / ${totalPages}` },
        { label: "Event keys", value: `${eventOptions.length}` },
      ]}
    >
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <SendHorizonal className="h-4 w-4" />
            Manual send
          </div>
          <div className="mt-4 grid gap-3">
            <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="recipient@email.com" className="h-11 rounded-2xl" />
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject email" className="h-11 rounded-2xl" />
            <Input value={eventKey} onChange={(e) => setEventKey(e.target.value)} placeholder="event key, mis. onboarding" className="h-11 rounded-2xl" />
            <Textarea value={html} onChange={(e) => setHtml(e.target.value)} className="min-h-28 rounded-2xl" placeholder="HTML content" />
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-20 rounded-2xl" placeholder="Plain text content" />
            <Button className="rounded-2xl" disabled={sending} onClick={handleSend}>
              <Mail className="mr-2 h-4 w-4" />
              {sending ? "Sending..." : "Send email"}
            </Button>
            {feedback ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                {feedback}
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
          <div className="grid gap-3 xl:grid-cols-5">
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                {eventOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search recipient, subject, event..." className="h-11 rounded-2xl xl:col-span-2" />
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                const nextQuery = query.trim();
                setPage(1);
                setAppliedQuery(nextQuery);
                if (page === 1 && appliedQuery === nextQuery) {
                  void loadLogs();
                }
              }}
            >
              Apply
            </Button>
          </div>

          <div className="mt-4 grid gap-3">
            {data.items.map((item) => (
              <Card key={item.id} className="rounded-3xl border-slate-200 p-4 shadow-none dark:border-white/10 dark:bg-[#050505]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="text-base font-semibold text-slate-950 dark:text-white">{item.subject || "(no subject)"}</div>
                    <div className="text-sm text-slate-500">{item.recipient}</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full uppercase">{item.event_key}</Badge>
                      <Badge variant="outline" className="rounded-full uppercase">{item.status}</Badge>
                      <Badge variant="outline" className="rounded-full uppercase">{item.source || "app"}</Badge>
                    </div>
                    {item.error_message ? (
                      <div className="text-sm text-rose-500">{item.error_message}</div>
                    ) : null}
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.provider}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.provider_message_id || "-"}</div>
                    <div className="mt-2 text-xs text-slate-500">{item.sent_at || item.created_at}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {data.items.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
              Belum ada log email.
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between">
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="h-11 w-36 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="25">25 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-2xl" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>
                Prev
              </Button>
              <Button variant="outline" className="rounded-2xl" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
