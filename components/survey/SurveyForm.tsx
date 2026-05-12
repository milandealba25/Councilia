"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SURVEY_VERSION,
  surveyV1Questions,
  userContextSchema,
  type UserContext,
} from "@/lib/survey/survey.v1";
import { saveUserContext } from "@/lib/survey/storage";
import { Button } from "@/components/ui/Button";

type Answers = Partial<Omit<UserContext, "surveyVersion">>;

export function SurveyForm() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isComplete = surveyV1Questions.every(
    (q) => answers[q.id] !== undefined,
  );

  function setAnswer<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete || submitting) return;
    setSubmitting(true);
    setError(null);

    const candidate = { surveyVersion: SURVEY_VERSION, ...answers };
    const parsed = userContextSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Datos inválidos");
      setSubmitting(false);
      return;
    }

    saveUserContext(parsed.data);
    router.push("/session");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      {surveyV1Questions.map((question, idx) => {
        const selected = answers[question.id];
        return (
          <fieldset key={question.id} className="flex flex-col gap-4">
            <legend className="flex items-baseline gap-3">
              <span className="font-mono text-xs uppercase tracking-wider text-accent">
                0{idx + 1}
              </span>
              <span className="text-balance text-lg font-medium text-foreground md:text-xl">
                {question.title}
              </span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {question.options.map((opt) => {
                const isSelected = selected === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`group flex cursor-pointer items-center gap-3 rounded-council border bg-elevated/60 px-4 py-3 text-sm transition ${
                      isSelected
                        ? "border-accent text-foreground shadow-council"
                        : "border-border text-muted hover:border-accent-muted hover:text-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={opt.value}
                      checked={isSelected}
                      onChange={() =>
                        setAnswer(
                          question.id,
                          opt.value as UserContext[typeof question.id],
                        )
                      }
                      className="size-3.5 accent-accent"
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {error && (
        <p className="rounded-council border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          Las 4 respuestas se condensan en <code className="font-mono">userContext</code> y
          alimentan al orquestador.
        </p>
        <Button type="submit" disabled={!isComplete || submitting}>
          {submitting ? "Preparando council…" : "Reunir mi council"}
        </Button>
      </div>
    </form>
  );
}
