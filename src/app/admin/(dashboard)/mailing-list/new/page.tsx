"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="rounded px-2.5 py-1.5 text-sm font-medium text-gray-dark transition hover:bg-cream-light"
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
    if (
      !window.confirm(
        "Send this broadcast to ALL confirmed subscribers? This cannot be undone."
      )
    ) {
      return;
    }
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/admin/mailing-list"
            className="text-sm text-gray-dark/60 hover:text-gray-dark"
          >
            ← Mailing list
          </Link>
          <h1 className="mt-1 font-heading text-2xl font-semibold text-purple-dark">
            New broadcast
          </h1>
          <p className="mt-1 text-sm text-gray-dark/70">
            Compose your email on the left. The live preview on the right shows
            exactly what recipients will see.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-md border px-4 py-3 text-sm ${
            messageKind === "success"
              ? "border-green-dark/40 bg-green-dark/5 text-green-dark"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
          role="status"
        >
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-dark">
              Subject
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. New styling service, limited slots"
              maxLength={200}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-dark">
              Content
            </label>
            <div className="overflow-hidden rounded-lg border border-gray-medium/60 bg-white">
              <div className="flex flex-wrap items-center gap-1 border-b border-gray-medium/40 bg-cream-light px-2 py-1.5">
                <ToolbarButton title="Bold" onClick={() => exec("bold")}>
                  <strong>B</strong>
                </ToolbarButton>
                <ToolbarButton title="Italic" onClick={() => exec("italic")}>
                  <em>I</em>
                </ToolbarButton>
                <ToolbarButton title="Underline" onClick={() => exec("underline")}>
                  <span className="underline">U</span>
                </ToolbarButton>
                <span className="mx-1 h-5 w-px bg-gray-medium/60" />
                <ToolbarButton
                  title="Heading"
                  onClick={() => exec("formatBlock", "<h2>")}
                >
                  H
                </ToolbarButton>
                <ToolbarButton
                  title="Paragraph"
                  onClick={() => exec("formatBlock", "<p>")}
                >
                  P
                </ToolbarButton>
                <span className="mx-1 h-5 w-px bg-gray-medium/60" />
                <ToolbarButton title="Bulleted list" onClick={() => exec("insertUnorderedList")}>
                  •
                </ToolbarButton>
                <ToolbarButton title="Numbered list" onClick={() => exec("insertOrderedList")}>
                  1.
                </ToolbarButton>
                <span className="mx-1 h-5 w-px bg-gray-medium/60" />
                <ToolbarButton title="Insert link" onClick={insertLink}>
                  🔗
                </ToolbarButton>
                <ToolbarButton title="Remove formatting" onClick={() => exec("removeFormat")}>
                  ⨯
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
            <p className="mt-1 text-xs text-gray-dark/60">
              Every email automatically gets the GRWTEE header and unsubscribe
              footer.
            </p>
          </div>

          <div className="rounded-lg border border-gray-medium/40 bg-cream-light/60 p-4">
            <label className="mb-1 block text-sm font-medium text-gray-dark">
              Send test to
            </label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Defaults to your admin email"
              />
              <Button
                variant="secondary"
                onClick={sendTest}
                disabled={testSending}
              >
                {testSending ? "Sending…" : "Send test"}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/admin/mailing-list">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button onClick={sendToAll} disabled={sending}>
              {sending ? "Sending…" : "Send to all confirmed subscribers"}
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-dark/60">
              Live preview
            </h2>
            <span className="text-xs text-gray-dark/60">
              Subject: <strong className="text-gray-dark">{subject || "(none)"}</strong>
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-medium/60 bg-white shadow-sm">
            <iframe
              title="Email preview"
              srcDoc={previewDoc}
              className="h-[720px] w-full"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
