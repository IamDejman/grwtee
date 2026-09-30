"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bold, ChevronLeft, Heading2, Italic, Link2, List, ListOrdered, Pilcrow, RemoveFormatting, Underline } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/admin/ui";
import { Input } from "@/components/ui/Input";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { adminFetch } from "@/lib/adminFetch";

const BRAND = {
  purple: "#422D64",
  purpleMedium: "#5B3D8A",
  green: "#0D674E",
  cream: "#F5F3E7",
  white: "#FFFFFF",
  gray: "#2C3E50",
  grayMuted: "#5a6c7d"
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPreviewDoc(subject: string, contentHtml: string): string {
  const unsubscribeUrl = "#unsubscribe";
  const safeSubject = escapeHtml(subject || "(no subject)");
  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>${safeSubject}</title></head>
<body style="margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${BRAND.cream};font-family:Georgia,'Times New Roman',serif;">
  <tr><td style="padding:32px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;margin:0 auto;background-color:${BRAND.white};border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(66,45,100,0.08);">
      <tr><td style="background:linear-gradient(135deg,${BRAND.purple} 0%,${BRAND.purpleMedium} 100%);padding:28px 32px;text-align:center;">
        <span style="font-size:26px;font-weight:700;letter-spacing:0.12em;color:${BRAND.white};font-family:Georgia,serif;">GRWTEE</span>
      </td></tr>
      <tr><td style="padding:36px 32px;font-size:15px;color:${BRAND.gray};line-height:1.65;">
        ${contentHtml || '<p style="color:#999;">Start writing your email…</p>'}
      </td></tr>
      <tr><td style="padding:20px 32px 28px;text-align:center;border-top:1px solid #e8e6df;">
        <p style="margin:0;font-size:12px;color:${BRAND.grayMuted};line-height:1.6;">
          You're receiving this because you subscribed to the GRWTEE mailing list.<br/>
          <a href="${unsubscribeUrl}" style="color:${BRAND.grayMuted};text-decoration:underline;">Unsubscribe</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

type ToolbarButtonProps = {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
};

function ToolbarButton({ onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="rounded-lg p-2 text-atelier-muted transition hover:bg-white hover:text-atelier-ink"
    >
      {children}
    </button>
  );
}

export default function NewBroadcastPage() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [previewDoc, setPreviewDoc] = useState<string>(buildPreviewDoc("", ""));
  const [confirmedCount, setConfirmedCount] = useState<number | null>(null);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    adminFetch("/api/admin/subscribers?status=confirmed")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { counts?: { confirmed?: number } } | null) => setConfirmedCount(data?.counts?.confirmed ?? null))
      .catch(() => setConfirmedCount(null));
  }, []);

  useEffect(() => {
    setPreviewDoc(buildPreviewDoc(subject, html));
  }, [subject, html]);

  function syncHtml() {
    if (editorRef.current) setHtml(editorRef.current.innerHTML);
  }

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    // document.execCommand is deprecated but still works in all browsers and requires no deps.
    document.execCommand(command, false, value);
    syncHtml();
  }

  function insertLink() {
    const url = window.prompt("Link URL:", "https://");
    if (!url) return;
    exec("createLink", url);
  }

  async function sendTest() {
    if (!subject.trim() || !html.trim()) {
      setMessage("Add a subject and content before sending a test.");
      setMessageKind("error");
      return;
    }
    setTestSending(true);
    setMessage(null);
    try {
      const res = await adminFetch("/api/admin/broadcasts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          html,
          to: testEmail.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed");
      }
      setMessage(`Test sent to ${data.sentTo}.`);
      setMessageKind("success");
    } catch (e) {
      setMessage((e as Error).message);
      setMessageKind("error");
    } finally {
      setTestSending(false);
    }
  }

  async function sendToAll() {
    if (!subject.trim() || !html.trim()) {
      setMessage("Add a subject and content before sending.");
      setMessageKind("error");
      return;
    }
    const audience =
      confirmedCount === null
        ? "all confirmed subscribers"
        : `${confirmedCount} confirmed subscriber${confirmedCount === 1 ? "" : "s"}`;
    const ok = await confirm({
      title: `Send to ${audience}?`,
      body: `"${subject.trim()}" goes out now. This can't be undone.`,
      confirmLabel: "Send now"
    });
    if (!ok) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await adminFetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, html })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed");
      }
      setMessage(
        `Broadcast sent. ${data.data.sentCount} delivered, ${data.data.failedCount} failed.`
      );
      setMessageKind("success");
      setTimeout(() => router.push("/admin/mailing-list"), 1500);
    } catch (e) {
      setMessage((e as Error).message);
      setMessageKind("error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {dialog}
      <Link
        href="/admin/mailing-list"
        className="-ml-1 mb-1 inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm text-atelier-muted transition hover:text-atelier-ink"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Mailing list
      </Link>
      <PageHeader title="New broadcast" />

      {message && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
            messageKind === "success" ? "bg-green-dark/10 text-green-dark" : "bg-red-50 text-red-700"
          }`}
          role="status"
        >
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Input
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. New styling service, limited slots"
              maxLength={200}
            />
          </div>

          <div>
            <p className="mb-1 block text-sm font-semibold text-gray-dark">Content</p>
            <div className="overflow-hidden rounded-2xl border border-atelier-border bg-white focus-within:border-purple-dark/40">
              <div className="flex flex-wrap items-center gap-0.5 border-b border-atelier-border bg-atelier-canvas px-2 py-1.5">
                <ToolbarButton title="Bold" onClick={() => exec("bold")}>
                  <Bold className="h-4 w-4" aria-hidden />
                </ToolbarButton>
                <ToolbarButton title="Italic" onClick={() => exec("italic")}>
                  <Italic className="h-4 w-4" aria-hidden />
                </ToolbarButton>
                <ToolbarButton title="Underline" onClick={() => exec("underline")}>
                  <Underline className="h-4 w-4" aria-hidden />
                </ToolbarButton>
                <span className="mx-1 h-5 w-px bg-atelier-border" />
                <ToolbarButton
                  title="Heading"
                  onClick={() => exec("formatBlock", "<h2>")}
                >
                  <Heading2 className="h-4 w-4" aria-hidden />
                </ToolbarButton>
                <ToolbarButton
                  title="Paragraph"
                  onClick={() => exec("formatBlock", "<p>")}
                >
                  <Pilcrow className="h-4 w-4" aria-hidden />
                </ToolbarButton>
                <span className="mx-1 h-5 w-px bg-atelier-border" />
                <ToolbarButton title="Bulleted list" onClick={() => exec("insertUnorderedList")}>
                  <List className="h-4 w-4" aria-hidden />
                </ToolbarButton>
                <ToolbarButton title="Numbered list" onClick={() => exec("insertOrderedList")}>
                  <ListOrdered className="h-4 w-4" aria-hidden />
                </ToolbarButton>
                <span className="mx-1 h-5 w-px bg-atelier-border" />
                <ToolbarButton title="Insert link" onClick={insertLink}>
                  <Link2 className="h-4 w-4" aria-hidden />
                </ToolbarButton>
                <ToolbarButton title="Remove formatting" onClick={() => exec("removeFormat")}>
                  <RemoveFormatting className="h-4 w-4" aria-hidden />
                </ToolbarButton>
              </div>
              <div
                ref={editorRef}
                contentEditable
                onInput={syncHtml}
                onBlur={syncHtml}
                suppressContentEditableWarning
                className="min-h-[340px] px-4 py-3 text-sm leading-relaxed text-gray-dark focus:outline-none [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-purple-dark [&_p]:mb-3 [&_a]:text-green-dark [&_a]:underline [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-atelier-border bg-white p-4">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
              <Input
                label="Send a test to"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Your admin email…"
              />
              </div>
              <Button size="sm" variant="outline" className="shrink-0" onClick={sendTest} disabled={testSending}>
                {testSending ? "Sending…" : "Send test"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <ButtonLink href="/admin/mailing-list" size="sm" variant="ghost">
              Cancel
            </ButtonLink>
            <Button size="sm" onClick={sendToAll} disabled={sending}>
              {sending ? "Sending…" : "Send to subscribers"}
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-atelier-faint">Preview</h2>
            <span className="truncate pl-3 text-xs text-atelier-muted">
              <strong className="font-medium text-atelier-ink">{subject || "-"}</strong>
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-atelier-border bg-white">
            <iframe
              title="Email preview"
              srcDoc={previewDoc}
              className="h-[520px] w-full lg:h-[720px]"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
