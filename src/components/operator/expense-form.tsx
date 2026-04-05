"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Camera, PlusCircle, X } from "lucide-react";
import { createExpense } from "@/lib/actions/expenses";
import { localDb } from "@/lib/offline/db";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "fuel",
  "parts",
  "repair",
  "labor",
  "transport",
  "misc",
] as const;

interface Vehicle {
  id: string;
  name: string;
}

interface Project {
  id: string;
  clientName: string;
}

interface Props {
  vehicles: Vehicle[];
  projects: Project[];
  defaultProjectId?: string | null;
  defaultVehicleId?: string | null;
  onAdded?: () => void;
}

function generateDeviceId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ExpenseForm({ vehicles, projects, defaultProjectId, defaultVehicleId, onAdded }: Props) {
  const t = useTranslations("operator");
  const tc = useTranslations("common");
  const tCat = useTranslations("expenses.categories");
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [category, setCategory] = useState("fuel");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [vehicleId, setVehicleId] = useState(defaultVehicleId ?? vehicles[0]?.id ?? "");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const today = new Date().toISOString().split("T")[0];

  // Silently capture GPS on mount — sent with expense, not shown to operator
  const [gpsCoords, setGpsCoords] = useState<{ lat: string; lng: string } | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGpsCoords({
          lat: pos.coords.latitude.toFixed(7),
          lng: pos.coords.longitude.toFixed(7),
        }),
      () => {},
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // Receipt photo state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

  async function handleReceiptSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setUploadError("");
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadReceipt(): Promise<string | null> {
    if (!receiptFile) return null;
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ filename: receiptFile.name, contentType: receiptFile.type }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const { uploadUrl, fileUrl } = await res.json() as { uploadUrl: string; fileUrl: string };
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": receiptFile.type },
        body: receiptFile,
      });
      return fileUrl;
    } catch {
      setUploadError(t("receiptUploadError"));
      return null;
    }
  }

  function handleSubmit() {
    if (!amount || !category) return;
    const descriptionRequired = !vehicleId && !projectId;
    if (category === "misc" && !description.trim()) return;
    if (descriptionRequired && !description.trim()) return;

    startTransition(async () => {
      const isOnline = navigator.onLine;
      let finalReceiptUrl = receiptUrl;

      if (isOnline) {
        // Upload receipt if a file was selected but not yet uploaded
        if (receiptFile && !receiptUrl) {
          finalReceiptUrl = await uploadReceipt();
        }
        await createExpense({
          vehicleId: vehicleId || undefined,
          projectId: projectId || undefined,
          category,
          amount,
          description: description || undefined,
          date: today,
          receiptImageUrl: finalReceiptUrl ?? undefined,
          gpsLat: gpsCoords?.lat,
          gpsLng: gpsCoords?.lng,
        });
      } else {
        await localDb.offlineExpenses.add({
          deviceId: generateDeviceId(),
          vehicleId: vehicleId || undefined,
          projectId: projectId || undefined,
          category,
          amount: parseFloat(amount),
          description: description || undefined,
          date: today,
          receiptImagePath: receiptPreview ?? undefined,
          syncStatus: "local",
          createdAt: Date.now(),
        });
      }

      setAmount("");
      setDescription("");
      setProjectId("");
      setReceiptPreview(null);
      setReceiptFile(null);
      setReceiptUrl(null);
      setUploadError("");
      setOpen(false);
      onAdded?.();
    });
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 w-full h-14 rounded-2xl border-2 border-dashed border-primary/40 text-primary font-medium justify-center active:scale-95 transition-transform"
        >
          <PlusCircle className="h-5 w-5" />
          {t("addExpense")}
        </button>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          {/* Category pills */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("expenseCategory")}
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                    category === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border"
                  )}
                >
                  {tCat(cat as never)}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle */}
          {vehicles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("vehicle")}
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">— {t("selectVehicle")} —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">— Select Project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.clientName}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("expenseAmount")} <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("expenseDescription")}
              {(category === "misc" || (!vehicleId && !projectId)) && (
                <span className="text-destructive"> *</span>
              )}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                category === "misc"
                  ? "Required for Miscellaneous"
                  : !vehicleId && !projectId
                  ? "Required when no vehicle or project selected"
                  : "e.g. Diesel fill-up"
              }
              className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {category === "misc" && !description.trim() && (
              <p className="text-xs text-destructive mt-1">Description is required for Miscellaneous</p>
            )}
            {!vehicleId && !projectId && !description.trim() && category !== "misc" && (
              <p className="text-xs text-destructive mt-1">Description is required when no vehicle or project is selected</p>
            )}
          </div>

          {/* Receipt photo */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("receiptPhoto")}
            </label>
            {receiptPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border w-full max-h-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={receiptPreview} alt="Receipt" className="w-full object-cover max-h-40" />
                <button
                  type="button"
                  onClick={() => { setReceiptPreview(null); setReceiptFile(null); setReceiptUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 w-full h-11 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm justify-center"
              >
                <Camera className="h-4 w-4" />
                {t("takePhoto")}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleReceiptSelect}
              className="hidden"
            />
            {uploadError && <p className="text-xs text-destructive mt-1">{uploadError}</p>}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 h-12 rounded-xl border border-border text-sm font-medium"
            >
              {tc("cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!amount || isPending || (category === "misc" && !description.trim()) || (!vehicleId && !projectId && !description.trim())}
              className={cn(
                "flex-1 h-12 rounded-xl text-sm font-bold transition-colors",
                amount && !isPending && !(category === "misc" && !description.trim()) && !(!vehicleId && !projectId && !description.trim())
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {isPending ? "..." : t("addExpense")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
