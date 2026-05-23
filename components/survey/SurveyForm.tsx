"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SURVEY_VERSION,
  surveyV1Questions,
  userContextSchema,
  type UserContext,
} from "@/lib/survey/survey.v1";
import { loadAuthSession } from "@/lib/auth/client";
import {
  fetchSurveyStatus,
  syncPendingSurvey,
} from "@/lib/auth/flow";
import {
  loadUserContextDraft,
  saveUserContext,
  saveUserContextDraft,
} from "@/lib/survey/storage";
import { Button } from "@/components/ui/Button";

type Answers = Partial<Omit<UserContext, "surveyVersion">>;

const QUESTION_INTROS: Record<string, string> = {
  decisionType: "Para empezar...",
  urgency: "· Y DIME...",
  needFromCouncil: "· ALGO IMPORTANTE...",
  fearedLoss: "· UNA ÚLTIMA COSA...",
  ageRange: "· TU RANGO DE EDAD...",
};

const QUESTION_ACKS: Record<string, string> = {
  decisionType: "Okay, anotado.",
  urgency: "Está bien, te sigo.",
  needFromCouncil: "Lo entiendo.",
  fearedLoss: "Gracias, lo tengo.",
  ageRange: "Perfecto, anotado.",
};

export function SurveyForm() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const total = surveyV1Questions.length;
  const answered = surveyV1Questions.filter(
    (q) => answers[q.id] !== undefined,
  ).length;
  const isComplete = answered === total;
  const progress = Math.round((answered / total) * 100);

  function setAnswer<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      saveUserContextDraft(next);
      return next;
    });
  }

  useEffect(() => {
    setAnswers(loadUserContextDraft());

    async function guardCompletedSurvey() {
      const session = loadAuthSession();
      if (!session) {
        router.replace("/login?mode=register&next=/onboarding" as never);
        return;
      }
      const status = await fetchSurveyStatus(session);
      if (status?.completed) {
        router.replace("/session" as never);
        return;
      }
      setCheckingStatus(false);
    }

    void guardCompletedSurvey();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete || submitting) return;
    setSubmitting(true);
    setError(null);

    const candidate = { surveyVersion: SURVEY_VERSION, ...answers };
    const parsed = userContextSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(
        parsed.error.errors[0]?.message ??
          "Algo no cuadró en las respuestas. ¿Probamos de nuevo?",
      );
      setSubmitting(false);
      return;
    }

    saveUserContext(parsed.data);
    const session = loadAuthSession();
    if (!session) {
      router.push("/login?mode=register&next=/onboarding" as never);
      return;
    }
    const synced = await syncPendingSurvey(session, { force: true });
    if (!synced) {
      setError("No pudimos guardar la encuesta en tu cuenta. Intenta de nuevo.");
      setSubmitting(false);
      return;
    }
    router.push("/session" as never);
  }

  if (checkingStatus) {
    return <p className="text-sm text-muted">Revisando tus respuestas...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <div className="sticky top-2 z-10 -mx-2 flex items-center gap-3 rounded-full border border-border/70 bg-surface/95 px-4 py-2 text-xs text-muted shadow-soft">
        <span className="text-foreground-soft">
          {answered} de {total}
        </span>
        <div
          className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-border/70"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-subtle">
          {isComplete ? "Listo" : "Tu turno"}
        </span>
      </div>

      {surveyV1Questions.map((question, idx) => {
        const selected = answers[question.id];
        const answeredThis = selected !== undefined;
        const ackText = QUESTION_ACKS[question.id] ?? "Anotado.";
        return (
          <fieldset
            key={question.id}
            className="flex flex-col gap-4 rounded-council-lg border border-border/70 bg-surface/82 p-5 shadow-soft md:p-7"
            style={{
              animation: `soft-rise 600ms ease-out ${idx * 100}ms both`,
            }}
          >
            <legend className="-mt-0.5 mb-1 flex items-baseline gap-3 px-1">
              <span className="text-xs uppercase tracking-[0.16em] text-accent">
                0{idx + 1}
              </span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-subtle">
                {QUESTION_INTROS[question.id] ?? ""}
              </span>
            </legend>
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-5">
              <p className="text-balance text-lg font-medium leading-snug text-foreground md:text-xl">
                {question.title}
              </p>
              {answeredThis && (
                <AnswerTypingEcho key={`${question.id}-${selected}`} text={ackText} />
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {question.options.map((opt) => {
                const isSelected = selected === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`group relative flex cursor-pointer items-center gap-3 rounded-council border bg-elevated/60 px-4 py-3 text-sm transition-all duration-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent/45 focus-within:ring-offset-2 focus-within:ring-offset-background ${
                      isSelected
                        ? "border-accent bg-accent-soft/40 text-foreground shadow-council"
                        : "border-border text-muted hover:-translate-y-px hover:border-accent/60 hover:bg-surface-soft/60 hover:text-foreground"
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
                      className="sr-only"
                    />
                    <span
                      className={`grid size-4 place-items-center rounded-full border transition-colors ${
                        isSelected
                          ? "border-accent bg-accent"
                          : "border-border-strong/70 bg-surface group-hover:border-accent/60"
                      }`}
                      aria-hidden
                    >
                      <span
                        className={`block size-1.5 rounded-full bg-white transition-opacity ${
                          isSelected ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </span>
                    <span className="leading-snug">{opt.label}</span>
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
        <p className="max-w-md text-xs leading-relaxed text-muted">
          Guardaremos estas respuestas para que el council mantenga contexto
          entre chats.
        </p>
        <Button type="submit" disabled={!isComplete || submitting}>
          {submitting
            ? "Reuniéndolos..."
            : isComplete
              ? "Sentarme con ellos"
              : `Faltan ${total - answered}`}
        </Button>
      </div>
    </form>
  );
}

function AnswerTypingEcho({ text }: { text: string }) {
  const [visible, setVisible] = useState("");

  useEffect(() => {
    setVisible("");
    let idx = 0;
    const timer = window.setInterval(() => {
      idx += 1;
      setVisible(text.slice(0, idx));
      if (idx >= text.length) {
        window.clearInterval(timer);
      }
    }, 28);
    return () => window.clearInterval(timer);
  }, [text]);

  const done = visible.length >= text.length;

  return (
    <p
      className="max-w-md text-sm leading-relaxed text-muted"
      style={{ animation: "soft-rise 360ms ease-out both" }}
      aria-live="polite"
    >
      {visible}
      {!done && (
        <span className="ml-1 inline-block h-4 w-[1px] animate-pulse bg-accent align-middle" />
      )}
    </p>
  );
}
