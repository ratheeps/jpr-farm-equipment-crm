"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  createCycle,
  updateCycle,
  deleteCycle,
} from "@/lib/actions/farms";
import { FarmInputs } from "./farm-inputs";
import { FarmHarvests } from "./farm-harvests";
import { Plus, Trash2, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

interface CycleInput {
  id: string;
  inputType: string;
  productName: string | null;
  quantity: string | null;
  unit: string | null;
  unitCost: string | null;
  totalCost: string;
  appliedDate: string | null;
  notes: string | null;
}

interface CycleHarvest {
  id: string;
  harvestDate: string;
  weightKg: string;
  grade: string | null;
  pricePerKg: string | null;
  revenue: string | null;
  notes: string | null;
}

interface Cycle {
  id: string;
  seasonName: string;
  stage: string;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  notes: string | null;
  inputs: CycleInput[];
  harvests: CycleHarvest[];
}

interface FarmCyclesProps {
  farmId: string;
  cycles: Cycle[];
}

const stageColors: Record<string, string> = {
  land_prep: "bg-blue-100 text-blue-700",
  sowing: "bg-yellow-100 text-yellow-700",
  growth: "bg-green-100 text-green-700",
  harvesting: "bg-orange-100 text-orange-700",
  completed: "bg-gray-100 text-gray-700",
};

const STAGE_ORDER = ["land_prep", "sowing", "growth", "harvesting", "completed"];

function nextStage(current: string): string | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function FarmCycles({ farmId, cycles }: FarmCyclesProps) {
  const t = useTranslations("farms");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [expandedId, setExpandedId] = useState<string | null>(
    cycles.length > 0 ? cycles[0].id : null
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add form state
  const [seasonName, setSeasonName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setShowAddForm(false);
    setSeasonName("");
    setStartDate("");
    setExpectedEndDate("");
    setNotes("");
  }

  async function handleAddCycle() {
    if (!seasonName) return;
    setLoading(true);
    try {
      await createCycle(farmId, {
        seasonName,
        startDate: startDate || undefined,
        expectedEndDate: expectedEndDate || undefined,
        notes: notes || undefined,
      });
      resetForm();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleAdvanceStage(cycle: Cycle) {
    const next = nextStage(cycle.stage);
    if (!next) return;
    setAdvancingId(cycle.id);
    try {
      await updateCycle(cycle.id, {
        seasonName: cycle.seasonName,
        stage: next,
        startDate: cycle.startDate || undefined,
        expectedEndDate: cycle.expectedEndDate || undefined,
        actualEndDate:
          next === "completed" ? new Date().toISOString().split("T")[0] : cycle.actualEndDate || undefined,
        notes: cycle.notes || undefined,
      });
      router.refresh();
    } finally {
      setAdvancingId(null);
    }
  }

  async function handleDeleteCycle(id: string) {
    if (!confirm(tCommon("confirm"))) return;
    setDeletingId(id);
    try {
      await deleteCycle(id);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-6 pb-8">
      <h2 className="text-base font-semibold text-foreground mb-3">
        {t("cycles")}
      </h2>

      {cycles.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t("noCycles")}
        </p>
      ) : (
        <div className="space-y-3 mb-4">
          {cycles.map((cycle) => {
            const isExpanded = expandedId === cycle.id;
            const next = nextStage(cycle.stage);

            return (
              <div
                key={cycle.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Cycle header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : cycle.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {cycle.seasonName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          stageColors[cycle.stage] ?? "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {t(`stages.${cycle.stage}` as Parameters<typeof t>[0])}
                      </span>
                      {cycle.startDate && (
                        <span className="text-[10px] text-muted-foreground">
                          {cycle.startDate}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                    <span className="text-[10px]">
                      {cycle.inputs.length}i · {cycle.harvests.length}h
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-3">
                    {/* Stage advance + delete */}
                    <div className="flex items-center gap-2 mb-3">
                      {next && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStage(cycle)}
                          disabled={advancingId === cycle.id}
                          className="flex items-center gap-1.5 h-8 px-3 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-60"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                          {t("advanceStage")}:{" "}
                          {t(`stages.${next}` as Parameters<typeof t>[0])}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteCycle(cycle.id)}
                        disabled={deletingId === cycle.id}
                        className="ml-auto h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Inputs */}
                    <FarmInputs cycleId={cycle.id} inputs={cycle.inputs} />

                    {/* Harvests */}
                    <FarmHarvests
                      cycleId={cycle.id}
                      harvests={cycle.harvests}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add cycle form */}
      {showAddForm ? (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">
            {t("addCycle")}
          </p>

          <input
            type="text"
            value={seasonName}
            onChange={(e) => setSeasonName(e.target.value)}
            placeholder={t("seasonName")}
            required
            className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground">
                {t("startDate")}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground">
                {t("expectedEndDate")}
              </label>
              <input
                type="date"
                value={expectedEndDate}
                onChange={(e) => setExpectedEndDate(e.target.value)}
                className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={tCommon("notes")}
            rows={2}
            className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base resize-none"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 h-10 border border-input rounded-lg text-sm font-medium text-foreground bg-background"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              onClick={handleAddCycle}
              disabled={loading || !seasonName}
              className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {loading ? tCommon("loading") : tCommon("save")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center gap-2 w-full h-11 border border-input rounded-xl text-sm font-medium text-foreground bg-background"
        >
          <Plus className="h-4 w-4" />
          {t("addCycle")}
        </button>
      )}
    </div>
  );
}
