"use client";

import { useState } from "react";
import { Camera, CheckCircle2, Upload } from "lucide-react";

async function compressProfilePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use a JPG, PNG or WebP image.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();

    const maxDimension = 900;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare this photo.");
    context.drawImage(image, 0, 0, width, height);

    for (const quality of [0.84, 0.74, 0.64, 0.54]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= 900 * 1024) {
        return new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
      }
    }
    throw new Error("Please choose a smaller photo.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ProviderPhotoUpload({ businessId, photoReady }: { businessId: string; photoReady: boolean }) {
  const [busy, setBusy] = useState(false);
  const [attested, setAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    if (!attested) {
      setError("Confirm that this is a recent, clear photo of you before uploading.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const prepared = await compressProfilePhoto(file);
      const form = new FormData();
      form.set("photo", prepared);
      form.set("attestedRecent", "true");

      const response = await fetch(`/api/providers/${businessId}/photo`, {
        method: "POST",
        body: form
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error?.replaceAll("_", " ") ?? "Unable to upload photo.");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload photo.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]"><Camera size={22} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-slate-950">Recent face photo</h3>
            {photoReady && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800"><CheckCircle2 size={13} /> Added</span>}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Customers need to recognize the person arriving for the service. Use a recent, clear photo showing your face. Logos, tools, vehicles, group photos and generated avatars should not be used.</p>
          {photoReady && <img src={`/api/providers/${businessId}/photo`} alt="Current professional profile" className="mt-4 h-28 w-28 rounded-2xl border border-slate-200 object-cover" />}
          <label className="mt-4 flex cursor-pointer gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
            <span>I confirm this is a recent photo of me and that my face is clearly visible. I understand VeroTask may retain prior versions for security, audit and legal recordkeeping.</span>
          </label>
          <label className={`btn-secondary mt-4 cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
            <Upload size={17} /> {busy ? "Uploading…" : photoReady ? "Replace photo" : "Add required photo"}
            <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="user" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
          </label>
          {error && <p className="mt-3 text-sm font-bold text-red-700">{error}</p>}
        </div>
      </div>
    </div>
  );
}
