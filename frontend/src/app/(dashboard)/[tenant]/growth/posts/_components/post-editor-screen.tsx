"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Film, Image as ImageIcon, Megaphone, Save } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import { FeedIdeaCard, InspirationRail } from "../../_components/marketplace-cards";
import { type GrowthPostRecord } from "../../_lib/growth-data";
import { useGrowthWorkspace } from "../../_lib/use-growth-workspace";

type EditorMode = "create" | "edit";

type PostFormState = {
  type: "photo" | "video" | "promo" | "update";
  title: string;
  caption: string;
  cover_media_url: string;
  thumbnail_url: string;
  cta: string;
  status: "draft" | "scheduled" | "published";
  visibility: "feed" | "highlight" | "private";
  starts_at: string;
  ends_at: string;
};

type Props = {
  mode: EditorMode;
  postId?: string;
};

const DEFAULT_FORM: PostFormState = {
  type: "photo",
  title: "",
  caption: "",
  cover_media_url: "",
  thumbnail_url: "",
  cta: "",
  status: "draft",
  visibility: "feed",
  starts_at: "",
  ends_at: "",
};

const contentFormats = [
  {
    title: "Foto",
    description: "Untuk menunjukkan suasana, ruangan, atau setup dengan cepat.",
    icon: ImageIcon,
  },
  {
    title: "Video pendek",
    description: "Untuk tour singkat, ambience, atau momen yang lebih hidup.",
    icon: Film,
  },
  {
    title: "Promo",
    description: "Untuk offer, momentum ramai, atau campaign terbatas.",
    icon: Megaphone,
  },
  {
    title: "Update",
    description: "Untuk event, fasilitas baru, atau kabar penting.",
    icon: CalendarClock,
  },
];

export function PostEditorScreen({ mode, postId }: Props) {
  const router = useRouter();
  const { posts, marketplaceSamples, loading, reload } = useGrowthWorkspace();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PostFormState>(DEFAULT_FORM);
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pendingBack, setPendingBack] = useState(false);
  const bypassGuardRef = useRef(false);

  const editingPost = useMemo(() => {
    if (!postId) return null;
    return posts.find((post) => post.id === postId) || null;
  }, [postId, posts]);

  const initialForm = useMemo<PostFormState>(() => {
    if (mode === "edit" && editingPost) {
      return {
        type: normalizeType(editingPost.type),
        title: editingPost.title || "",
        caption: editingPost.caption || "",
        cover_media_url: editingPost.cover_media_url || "",
        thumbnail_url: editingPost.thumbnail_url || "",
        cta: editingPost.cta || "",
        status: normalizeStatus(editingPost.status),
        visibility: normalizeVisibility(editingPost.visibility),
        starts_at: toDatetimeLocal(editingPost.starts_at),
        ends_at: toDatetimeLocal(editingPost.ends_at),
      };
    }
    return DEFAULT_FORM;
  }, [editingPost, mode]);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const isDirty = useMemo(() => serializeForm(form) !== serializeForm(initialForm), [form, initialForm]);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (bypassGuardRef.current) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const nextHref = anchor.href;
      if (!nextHref || nextHref === window.location.href) return;
      event.preventDefault();
      setPendingHref(nextHref);
      setPendingBack(false);
      setPromptOpen(true);
    };

    const handlePopState = () => {
      if (bypassGuardRef.current) return;
      setPendingHref(null);
      setPendingBack(true);
      setPromptOpen(true);
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty]);

  const leaveNow = () => {
    bypassGuardRef.current = true;
    setPromptOpen(false);
    if (pendingHref) {
      router.push(pendingHref);
      return;
    }
    if (pendingBack) {
      window.history.back();
      return;
    }
    router.push("/growth/posts");
  };

  const submitForm = async (forcedStatus?: PostFormState["status"]) => {
    if (!form.title.trim()) {
      toast.error("Judul postingan wajib diisi");
      return null;
    }

    const payload = {
      ...form,
      status: forcedStatus || form.status,
      title: form.title.trim(),
      caption: form.caption.trim(),
      cover_media_url: form.cover_media_url.trim(),
      thumbnail_url: form.thumbnail_url.trim() || form.cover_media_url.trim(),
      cta: form.cta.trim(),
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    };

    setSaving(true);
    try {
      if (mode === "edit" && editingPost) {
        const res = await api.put(`/admin/growth/posts/${editingPost.id}`, payload);
        toast.success("Postingan berhasil diperbarui");
        await reload();
        return res.data?.data as GrowthPostRecord | undefined;
      }

      const res = await api.post("/admin/growth/posts", payload);
      toast.success(forcedStatus === "draft" ? "Draft berhasil disimpan" : "Postingan berhasil dibuat");
      await reload();
      return res.data?.data as GrowthPostRecord | undefined;
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan postingan"));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const saved = await submitForm();
    if (!saved) return;

    bypassGuardRef.current = true;
    if (mode === "create" && saved.id) {
      router.replace(`/growth/posts/${saved.id}/edit`);
      return;
    }
    router.refresh();
  };

  const handleSaveDraftAndLeave = async () => {
    const saved = await submitForm("draft");
    if (!saved) return;
    leaveNow();
  };

  if (loading) {
    return <EditorSkeleton />;
  }

  if (mode === "edit" && !editingPost) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" className="h-10 rounded-xl">
          <Link href="/growth/posts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke daftar post
          </Link>
        </Button>
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-black tracking-tight text-slate-950">Postingan tidak ditemukan.</div>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            Bisa jadi postingan sudah dihapus atau belum berhasil dimuat. Coba kembali ke daftar post.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Button asChild variant="ghost" className="-ml-3 h-9 rounded-xl px-3 text-slate-500 hover:text-slate-950">
            <Link href="/growth/posts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke daftar post
            </Link>
          </Button>
          <div className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
            {mode === "create" ? "Buat Post Baru" : "Edit Post"}
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            {mode === "create" ? "Rancang postingan baru untuk Feed Bookinaja." : "Rapikan postingan yang sudah kamu buat."}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            Fokus di satu layar: isi hook, visual utama, status tayang, dan alasan kenapa postingan ini layak masuk feed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => void reload()}>
            Refresh data
          </Button>
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => setPromptOpen(true)}>
            Batal
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving} className="h-11 rounded-xl bg-blue-600 hover:bg-blue-500">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Menyimpan..." : mode === "create" ? "Buat postingan" : "Simpan perubahan"}
          </Button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {contentFormats.map((item) => (
                <div key={item.title} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <item.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="mt-3 text-sm font-black tracking-tight text-slate-950">{item.title}</div>
                  <p className="mt-1 text-xs leading-6 text-slate-500">{item.description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-4">
              <FormField label="Jenis postingan">
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm((current) => ({ ...current, type: value as PostFormState["type"] }))}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl">
                    <SelectValue placeholder="Pilih jenis postingan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photo">Foto</SelectItem>
                    <SelectItem value="video">Video pendek</SelectItem>
                    <SelectItem value="promo">Promo</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Judul postingan">
                <Input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Contoh: Private room sekarang lebih enak buat main rame-rame"
                />
              </FormField>

              <FormField label="Caption singkat">
                <Textarea
                  value={form.caption}
                  onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))}
                  className="min-h-32"
                  placeholder="Jelaskan suasana, alasan menarik, atau momentum postingan ini."
                />
              </FormField>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Status">
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm((current) => ({ ...current, status: value as PostFormState["status"] }))}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Visibilitas">
                  <Select
                    value={form.visibility}
                    onValueChange={(value) => setForm((current) => ({ ...current, visibility: value as PostFormState["visibility"] }))}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feed">Feed</SelectItem>
                      <SelectItem value="highlight">Highlight</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Mulai tampil">
                  <Input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))}
                  />
                </FormField>
                <FormField label="Berhenti tampil">
                  <Input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))}
                  />
                </FormField>
              </div>

              <FormField label="Tombol ajakan (opsional)">
                <Input
                  value={form.cta}
                  onChange={(event) => setForm((current) => ({ ...current, cta: event.target.value }))}
                  placeholder="Contoh: Lihat detail"
                />
              </FormField>
            </div>
          </Card>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
          <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm">
            <FormField label="Gambar utama">
              <SingleImageUpload
                label=""
                value={form.cover_media_url}
                onChange={(url) =>
                  setForm((current) => ({
                    ...current,
                    cover_media_url: url,
                    thumbnail_url: current.thumbnail_url || url,
                  }))
                }
                aspect="video"
              />
            </FormField>

            <div className="mt-4">
              <FormField label="Thumbnail (opsional)">
                <SingleImageUpload
                  label=""
                  value={form.thumbnail_url}
                  onChange={(url) => setForm((current) => ({ ...current, thumbnail_url: url }))}
                  aspect="video"
                />
              </FormField>
            </div>
          </Card>

          <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
              Preview ringkas
            </div>
            <div className="mt-3 text-lg font-black tracking-tight text-slate-950">
              {form.title || "Judul postingan"}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {form.caption || "Caption singkat akan muncul di sini."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="rounded-full bg-blue-50 text-blue-700">{labelForType(form.type)}</Badge>
              <Badge className="rounded-full bg-slate-200 text-slate-700">{form.status}</Badge>
              <Badge className="rounded-full bg-slate-200 text-slate-700">{form.visibility}</Badge>
            </div>
          </Card>

          <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
              Inspirasi feed
            </div>
            <div className="mt-2 text-lg font-black tracking-tight text-slate-950">
              Lihat tenant lain yang sedang aktif
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Amati angle visual, headline, dan jenis post yang terasa paling hidup di Feed Bookinaja.
            </p>
            <div className="mt-4 space-y-3">
              <FeedIdeaCard
                title="Post promo"
                description="Bagus untuk dorong traffic saat ada momentum yang jelas."
                icon="reach"
              />
              <FeedIdeaCard
                title="Post ambience"
                description="Jual suasana dan pengalaman, bukan cuma daftar fitur."
                icon="video"
              />
            </div>
          </Card>
        </aside>
      </div>

      <section className="space-y-3">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
            Feed Bookinaja
          </div>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
            Referensi tenant lain
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            Pakai ini untuk membaca ritme visual dan cara menulis hook yang sedang tayang di feed.
          </p>
        </div>
        <InspirationRail items={marketplaceSamples} />
      </section>

      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent className="max-w-md rounded-[1.5rem]">
          <DialogHeader>
            <DialogTitle>Perubahan belum disimpan</DialogTitle>
            <DialogDescription>
              Kamu punya perubahan yang belum disimpan. Mau buang perubahan atau simpan dulu sebagai draft?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromptOpen(false)}>
              Lanjut edit
            </Button>
            <Button
              variant="outline"
              onClick={leaveNow}
            >
              Buang perubahan
            </Button>
            <Button
              onClick={() => void handleSaveDraftAndLeave()}
              disabled={saving || !form.title.trim()}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {saving ? "Menyimpan..." : "Simpan draft dulu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-600">{label}</Label>
      {children}
    </div>
  );
}

function normalizeType(value?: string): PostFormState["type"] {
  switch (value) {
    case "video":
    case "promo":
    case "update":
      return value;
    default:
      return "photo";
  }
}

function normalizeStatus(value?: string): PostFormState["status"] {
  switch (value) {
    case "scheduled":
    case "published":
      return value;
    default:
      return "draft";
  }
}

function normalizeVisibility(value?: string): PostFormState["visibility"] {
  switch (value) {
    case "highlight":
    case "private":
      return value;
    default:
      return "feed";
  }
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function labelForType(type?: string) {
  switch (type) {
    case "video":
      return "Video";
    case "promo":
      return "Promo";
    case "update":
      return "Update";
    default:
      return "Foto";
  }
}

function serializeForm(form: PostFormState) {
  return JSON.stringify(form);
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error &&
    "response" in error &&
    typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
  ) {
    return (error as { response?: { data?: { error?: string } } }).response!.data!.error!;
  }
  return fallback;
}

function EditorSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-20 rounded-[1.25rem] bg-white" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="h-40 rounded-[1.75rem] bg-white" />
          <div className="h-[720px] rounded-[1.75rem] bg-white" />
        </div>
        <div className="space-y-4">
          <div className="h-72 rounded-[1.75rem] bg-white" />
          <div className="h-44 rounded-[1.75rem] bg-white" />
          <div className="h-60 rounded-[1.75rem] bg-white" />
        </div>
      </div>
    </div>
  );
}
