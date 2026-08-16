"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Loader2, Network, Rocket } from "lucide-react";
import Button from "@/components/ui/Button";
import { useBusiness } from "@/lib/business-context";

const INDUSTRIES = ["B2B SaaS", "Fintech", "E-commerce", "Agency", "Professional services", "Other"];
const SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

const ease = [0.22, 1, 0.36, 1] as const;

export default function Onboarding() {
  const reduced = useReducedMotion();
  const { create } = useBusiness();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length > 0;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await create({
        name: name.trim(),
        industry: industry || null,
        size: size || null,
        description: description.trim() || null,
        goals: goals.trim() || null,
      });
      // On success the business context flips to "ready" and the app shell
      // takes over — no navigation needed.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to initialize your business.");
      setSaving(false);
    }
  };

  return (
    <div className="onboarding">
      <div className="onboarding-glow" aria-hidden />
      <motion.div
        className="onboarding-card"
        initial={reduced ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
      >
        <div className="onboarding-mark">
          <Network size={22} strokeWidth={2} aria-hidden />
        </div>

        <p className="onboarding-eyebrow">Initialize your business</p>
        <h1 className="onboarding-title">
          Tell VenturePilot
          <br />
          <span className="onboarding-accent">what you&apos;re building.</span>
        </h1>
        <p className="onboarding-sub">
          Your AI team will use this context to coordinate research, prospecting, sales, marketing and analytics.
        </p>

        <div className="onboarding-fields">
          <div className="field">
            <label htmlFor="ob-name">Business name</label>
            <input
              id="ob-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Northwind Labs"
              autoFocus
            />
          </div>

          <div className="onboarding-row">
            <div className="field">
              <label htmlFor="ob-industry">Industry</label>
              <select id="ob-industry" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                <option value="">Select…</option>
                {INDUSTRIES.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ob-size">Company size</label>
              <select id="ob-size" value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="">Select…</option>
                {SIZES.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="ob-desc">Business description</label>
            <textarea
              id="ob-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your company do?"
              rows={2}
            />
          </div>

          <div className="field">
            <label htmlFor="ob-goals">Primary goals</label>
            <textarea
              id="ob-goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. Generate 50 qualified B2B opportunities this quarter"
              rows={2}
            />
          </div>
        </div>

        {error && (
          <div className="onboarding-error" role="alert">
            {error}
          </div>
        )}

        <div className="onboarding-cta">
          <Button variant="solid" onClick={submit} disabled={!valid || saving}>
            {saving ? <Loader2 size={15} className="spin" /> : <Rocket size={15} />}
            {saving ? "Initializing…" : "Initialize AI Team"}
            {!saving && <ArrowRight size={15} />}
          </Button>
          <span className="onboarding-note">
            Your business profile is stored securely as the context for every agent.
          </span>
        </div>
      </motion.div>
    </div>
  );
}
