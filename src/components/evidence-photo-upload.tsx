"use client";

import { useRef, useState } from "react";
import { Camera, LoaderCircle } from "lucide-react";

type Locale = "en" | "pt-br" | "es";
type EvidenceKind = "before" | "after";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const COPY = {
  en: {
    title: "Service photos",
    help: "Add clear photos as private evidence for this booking. JPEG, PNG or WebP, up to 10 MB.",
    before: "Add before photo",
    after: "Add after photo",
    uploading: "Uploading…",
    invalidType: "Choose a JPEG, PNG or WebP image.",
    invalidSize: "The image must be no larger than 10 MB.",
    error: "The photo could not be added. Please try again."
  },
  "pt-br": {
    title: "Fotos do serviço",
    help: "Adicione fotos nítidas como evidência privada desta reserva. JPEG, PNG ou WebP, até 10 MB.",
    before: "Adicionar foto de antes",
    after: "Adicionar foto de depois",
    uploading: "Enviando…",
    invalidType: "Escolha uma imagem JPEG, PNG ou WebP.",
    invalidSize: "A imagem deve ter no máximo 10 MB.",
    error: "Não foi possível adicionar a foto. Tente novamente."
  },
  es: {
    title: "Fotos del servicio",
    help: "Agrega fotos claras como evidencia privada de esta reserva. JPEG, PNG o WebP, hasta 10 MB.",
    before: "Agregar foto de antes",
    after: "Agregar foto de después",
    uploading: "Subiendo…",
    invalidType: "Elige una imagen JPEG, PNG o WebP.",
    invalidSize: "La imagen no puede superar los 10 MB.",
    error: "No se pudo agregar la foto. Inténtalo de nuevo."
  }
} as const;

type Props = {
  bookingId: string;
  status: string;
  locale: Locale;
};

type PresignResponse = {
  uploadUrl?: string;
  objectRef?: string;
  expectedByteSize?: number;
  requiredHeaders?: Record<string, string>;
  error?: string;
};

export function EvidencePhotoUpload({ bookingId, status, locale }: Props) {
  const copy = COPY[locale];
  const inputRefs = {
    before: useRef<HTMLInputElement>(null),
    after: useRef<HTMLInputElement>(null)
  };
  const [uploading, setUploading] = useState<EvidenceKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const availableKinds: EvidenceKind[] = status === "scheduled" ? ["before"] : status === "in_progress" ? ["before", "after"] : [];

  async function upload(kind: EvidenceKind, file: File) {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setError(copy.invalidType);
      return;
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      setError(copy.invalidSize);
      return;
    }

    setUploading(kind);
    setError(null);
    try {
      const presignResponse = await fetch(`/api/bookings/${bookingId}/uploads/presign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, contentType: file.type, byteSize: file.size })
      });
      const presign = await presignResponse.json().catch(() => ({})) as PresignResponse;
      if (!presignResponse.ok || !presign.uploadUrl || !presign.objectRef || presign.expectedByteSize !== file.size) {
        throw new Error(presign.error || "invalid_upload_authorization");
      }

      const uploadResponse = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: presign.requiredHeaders,
        body: file
      });
      if (!uploadResponse.ok) throw new Error("upload_failed");

      const evidenceResponse = await fetch(`/api/bookings/${bookingId}/evidence`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: `${kind}_photo`, objectRef: presign.objectRef })
      });
      if (!evidenceResponse.ok) {
        const evidence = await evidenceResponse.json().catch(() => ({})) as { error?: string };
        throw new Error(evidence.error || "evidence_attach_failed");
      }
      window.location.reload();
    } catch {
      setError(copy.error);
      setUploading(null);
    }
  }

  if (availableKinds.length === 0) return null;

  return (
    <div className="md:col-span-2 rounded-xl border border-[var(--line)] bg-[var(--background)] p-4">
      <div className="font-black">{copy.title}</div>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{copy.help}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {availableKinds.map((kind) => (
          <div key={kind}>
            <input
              ref={inputRefs[kind]}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading !== null}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void upload(kind, file);
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={uploading !== null}
              onClick={() => inputRefs[kind].current?.click()}
            >
              {uploading === kind ? <LoaderCircle className="animate-spin" size={17} /> : <Camera size={17} />}
              {uploading === kind ? copy.uploading : copy[kind]}
            </button>
          </div>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{error}</p>}
    </div>
  );
}
