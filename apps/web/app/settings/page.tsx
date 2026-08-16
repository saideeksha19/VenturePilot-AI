"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, Loader2, Save } from "lucide-react";
import API from "@/lib/services";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SectionHead from "@/components/ui/SectionHead";
import { useBusiness } from "@/lib/business-context";
import type { BusinessPatch } from "@/lib/business-context";
import type { SettingsData } from "@/lib/types";

const INDUSTRIES = ["B2B SaaS", "Fintech", "E-commerce", "Agency", "Professional services", "Other"];
const SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

type SaveState = "idle" | "saving" | "saved" | "error";

export default function SettingsPage() {
  const reduced = useReducedMotion();
  const { business, update } = useBusiness();
  const [data, setData] = useState<SettingsData | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Draft fields, initialized from the real business profile.
  const [draft, setDraft] = useState<BusinessPatch>({});
  useEffect(() => {
    if (business) {
      setDraft({
        name: business.name,
        industry: business.industry,
        size: business.size,
        description: business.description,
        goals: business.goals,
      });
    }
  }, [business]);

  useEffect(() => {
    API.getSettings().then(setData);
  }, []);

  if (!business) return null;

  const toggle = (key: string) =>
    setData((d) =>
      d ? { ...d, toggles: d.toggles.map((t) => (t.key === key ? { ...t, on: !t.on } : t)) } : d
    );

  const save = async () => {
    if (saveState === "saving") return;
    setSaveState("saving");
    setSaveError(null);
    try {
      await update(draft);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Unable to save changes.");
      setSaveState("error");
      window.setTimeout(() => setSaveState("idle"), 4000);
    }
  };

  const dirty =
    JSON.stringify(draft) !==
    JSON.stringify({
      name: business.name,
      industry: business.industry,
      size: business.size,
      description: business.description,
      goals: business.goals,
    });

  return (
    <motion.div
      className="page-enter"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="page-head">
        <div>
          <p className="page-eyebrow">Workspace</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Your business profile and how the AI team operates.</p>
        </div>
      </div>

      <div className="settings-grid">
        <Card className="card-pad">
          <SectionHead title="Business profile" sub="Used by every agent as the shared context" />
          <div className="field">
            <label htmlFor="biz-name">Business name</label>
            <input
              id="biz-name"
              value={draft.name ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="biz-industry">Industry</label>
            <select
              id="biz-industry"
              value={draft.industry ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, industry: e.target.value || null }))}
            >
              <option value="">—</option>
              {INDUSTRIES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="biz-size">Company size</label>
            <select
              id="biz-size"
              value={draft.size ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, size: e.target.value || null }))}
            >
              <option value="">—</option>
              {SIZES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="biz-desc">Business description</label>
            <textarea
              id="biz-desc"
              rows={3}
              value={draft.description ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value || null }))}
            />
          </div>
          <div className="field">
            <label htmlFor="biz-goals">Primary goals</label>
            <textarea
              id="biz-goals"
              rows={3}
              value={draft.goals ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, goals: e.target.value || null }))}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <Button variant="solid" onClick={save} disabled={!dirty || saveState === "saving"}>
              {saveState === "saving" ? (
                <Loader2 size={15} className="spin" />
              ) : saveState === "saved" ? (
                <Check size={15} />
              ) : (
                <Save size={15} />
              )}
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? "Saved"
                  : saveState === "error"
                    ? "Unable to save"
                    : "Save changes"}
            </Button>
            {saveState === "saved" && (
              <motion.span
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ color: "var(--emerald)", fontSize: 13, fontWeight: 600 }}
              >
                Changes persisted.
              </motion.span>
            )}
            {saveState === "error" && (
              <motion.span
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ color: "var(--danger)", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}
                role="alert"
              >
                <AlertTriangle size={13} /> {saveError}
              </motion.span>
            )}
          </div>
        </Card>

        <Card className="card-pad">
          <SectionHead title="Agent behavior" sub="How much autonomy your AI team has" />
          {data?.toggles.map((t) => (
            <div className="row-toggle" key={t.key}>
              <div>
                <b>{t.label}</b>
                <span>{t.hint}</span>
              </div>
              <button
                type="button"
                className={`toggle${t.on ? " on" : ""}`}
                aria-pressed={t.on}
                aria-label={t.label}
                onClick={() => toggle(t.key)}
              />
            </div>
          ))}
        </Card>
      </div>
    </motion.div>
  );
}
