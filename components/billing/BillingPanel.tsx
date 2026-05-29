"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { getValidAuthSession } from "@/lib/auth/client";
import {
  PAID_PLAN_IDS,
  PLANS,
  type BillingCycle,
  type PlanId,
} from "@/lib/billing/plans";

interface SubscriptionSummary {
  status: string | null;
  billingCycle: BillingCycle | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
}

interface BillingStatus {
  stripeConfigured: boolean;
  plan: PlanId;
  subscription: SubscriptionSummary | null;
}

type Status = "idle" | "loading" | "ready" | "error";

const PLAN_ORDER: PlanId[] = ["free", ...PAID_PLAN_IDS];

const STATUS_LABEL: Record<string, string> = {
  active: "Activa",
  trialing: "Periodo de prueba",
  past_due: "Pago atrasado",
  unpaid: "Sin pagar",
  canceled: "Cancelada",
  incomplete: "Incompleta",
  incomplete_expired: "Expirada",
  paused: "En pausa",
};

const DATE_FORMAT = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function BillingPanel() {
  const [status, setStatus] = useState<Status>("idle");
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const autoSyncRef = useRef(false);

  const loadStatus = useCallback(async () => {
    setStatus("loading");
    const session = await getValidAuthSession();
    if (!session) {
      setStatus("error");
      setError("Necesitas iniciar sesión para gestionar tu plan.");
      return;
    }
    try {
      const response = await fetch("/api/billing/status", {
        headers: { authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | (BillingStatus & { error?: string })
        | null;
      if (!response.ok || !data) {
        throw new Error(data?.error ?? "No pudimos leer tu plan.");
      }
      setBilling({
        stripeConfigured: data.stripeConfigured,
        plan: data.plan,
        subscription: data.subscription,
      });
      if (data.subscription?.billingCycle) {
        setCycle(data.subscription.billingCycle);
      }
      setError(null);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Error inesperado.");
    }
  }, []);

  const syncFromStripe = useCallback(
    async (opts?: { silent?: boolean }) => {
      const session = await getValidAuthSession();
      if (!session) return;
      if (!opts?.silent) setPendingAction("sync");
      try {
        const response = await fetch("/api/billing/sync", {
          method: "POST",
          headers: { authorization: `Bearer ${session.accessToken}` },
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(data?.error ?? "No pudimos sincronizar con Stripe.");
        }
        await loadStatus();
        if (!opts?.silent) {
          setInfo("Plan sincronizado con Stripe.");
        }
      } catch (err) {
        if (!opts?.silent) {
          setError(err instanceof Error ? err.message : "Sincronización fallida.");
        }
      } finally {
        if (!opts?.silent) setPendingAction(null);
      }
    },
    [loadStatus],
  );

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // Cuando el usuario regresa de Checkout (?billing=success) ejecutamos
  // un sync inmediato para reflejar el plan sin depender del webhook.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (autoSyncRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const billingParam = params.get("billing");
    if (billingParam !== "success") return;
    autoSyncRef.current = true;
    setInfo("Confirmando tu pago con Stripe…");
    void syncFromStripe({ silent: true }).finally(() => {
      // Limpiamos la URL para que un reload no vuelva a disparar el sync.
      params.delete("billing");
      params.delete("session_id");
      const next = `${window.location.pathname}${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      window.history.replaceState({}, "", next);
      setInfo("Plan activado. ¡Bienvenido!");
    });
  }, [syncFromStripe]);

  const planDefinition = useMemo(
    () => (billing ? PLANS[billing.plan] : PLANS.free),
    [billing],
  );

  async function startCheckout(plan: PlanId) {
    setPendingAction(`checkout:${plan}`);
    setError(null);
    const session = await getValidAuthSession();
    if (!session) {
      setError("Inicia sesión otra vez para continuar al pago.");
      setPendingAction(null);
      return;
    }
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ plan, billingCycle: cycle }),
      });
      const data = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!response.ok || !data?.url) {
        throw new Error(data?.error ?? "Stripe no devolvió URL de checkout.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos abrir el checkout.");
      setPendingAction(null);
    }
  }

  async function openPortal() {
    setPendingAction("portal");
    setError(null);
    const session = await getValidAuthSession();
    if (!session) {
      setError("Inicia sesión otra vez para abrir el portal.");
      setPendingAction(null);
      return;
    }
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { authorization: `Bearer ${session.accessToken}` },
      });
      const data = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!response.ok || !data?.url) {
        throw new Error(
          data?.error ?? "Stripe no devolvió URL del portal de facturación.",
        );
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos abrir el portal.");
      setPendingAction(null);
    }
  }

  if (status === "loading" || status === "idle") {
    return (
      <SectionCard>
        <p className="text-sm text-muted">Cargando tu plan…</p>
      </SectionCard>
    );
  }

  if (status === "error" || !billing) {
    return (
      <SectionCard>
        <p className="text-sm text-error">
          {error ?? "No pudimos cargar tu plan."}
        </p>
        <Button
          variant="secondary"
          type="button"
          className="mt-4 self-start"
          onClick={() => {
            void loadStatus();
          }}
        >
          Reintentar
        </Button>
      </SectionCard>
    );
  }

  if (!billing.stripeConfigured) {
    return (
      <SectionCard>
        <Header
          plan={billing.plan}
          status="Stripe no está activado todavía"
        />
        <p className="text-sm text-muted">
          Para habilitar pagos, configura <code>STRIPE_SECRET_KEY</code> y{" "}
          <code>STRIPE_WEBHOOK_SECRET</code> en tu entorno.
        </p>
      </SectionCard>
    );
  }

  const subscription = billing.subscription;
  const subscriptionLabel = subscription?.status
    ? STATUS_LABEL[subscription.status] ?? subscription.status
    : null;
  const renewalDate = subscription?.currentPeriodEnd
    ? DATE_FORMAT.format(new Date(subscription.currentPeriodEnd))
    : null;

  return (
    <SectionCard>
      <Header
        plan={billing.plan}
        status={subscriptionLabel ?? (billing.plan === "free" ? "Plan gratuito" : null)}
      />

      <p className="text-sm text-muted">
        {planDefinition.copy.description}
      </p>

      {subscription && billing.plan !== "free" && (
        <dl className="grid gap-3 text-sm text-foreground sm:grid-cols-2">
          {subscription.billingCycle && (
            <Row label="Facturación">
              {subscription.billingCycle === "annual" ? "Anual" : "Mensual"}
            </Row>
          )}
          {renewalDate && (
            <Row
              label={
                subscription.cancelAtPeriodEnd
                  ? "Acceso hasta"
                  : "Próxima renovación"
              }
            >
              {renewalDate}
            </Row>
          )}
          {subscription.hasCustomer && (
            <Row label="Cliente Stripe">Sincronizado</Row>
          )}
        </dl>
      )}

      {subscription?.hasCustomer && billing.plan !== "free" ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="primary"
            onClick={openPortal}
            disabled={pendingAction === "portal"}
          >
            {pendingAction === "portal"
              ? "Abriendo portal…"
              : "Gestionar facturación"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void syncFromStripe();
            }}
            disabled={pendingAction === "sync"}
          >
            {pendingAction === "sync" ? "Sincronizando…" : "Sincronizar con Stripe"}
          </Button>
          <PlanUpgradeLink currentPlan={billing.plan} />
        </div>
      ) : (
        <div className="grid gap-4">
          <CycleSwitch value={cycle} onChange={setCycle} />
          <div className="grid items-stretch gap-4 md:grid-cols-2">
            {PLAN_ORDER.filter((id) => id !== "free").map((id) => (
              <PricingCard
                key={id}
                plan={id}
                cycle={cycle}
                currentPlan={billing.plan}
                pending={pendingAction === `checkout:${id}`}
                onSelect={() => startCheckout(id)}
              />
            ))}
          </div>
          {subscription?.hasCustomer && (
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wider text-muted">
              <button
                type="button"
                onClick={() => {
                  void syncFromStripe();
                }}
                disabled={pendingAction === "sync"}
                className="underline-offset-4 hover:text-accent hover:underline disabled:opacity-50"
              >
                {pendingAction === "sync"
                  ? "Sincronizando con Stripe…"
                  : "Ya pagué · sincronizar plan"}
              </button>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={openPortal}
                disabled={pendingAction === "portal"}
                className="underline-offset-4 hover:text-accent hover:underline disabled:opacity-50"
              >
                {pendingAction === "portal"
                  ? "Abriendo portal…"
                  : "Abrir portal de facturación"}
              </button>
            </div>
          )}
        </div>
      )}

      {info && !error && (
        <p className="rounded-council border border-accent/40 bg-accent-soft/30 px-3 py-2 text-sm text-accent-strong">
          {info}
        </p>
      )}
      {error && (
        <p className="rounded-council border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}
    </SectionCard>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="grid gap-5 rounded-council-lg border border-border/70 bg-surface/70 p-6 shadow-council md:p-8">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">
          Facturación
        </h2>
      </header>
      {children}
    </section>
  );
}

function Header({
  plan,
  status,
}: {
  plan: PlanId;
  status: string | null;
}) {
  const definition = PLANS[plan];
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted">Plan actual</p>
        <h3 className="mt-1 text-2xl font-semibold text-foreground">
          {definition.copy.name}
        </h3>
      </div>
      {status && (
        <span className="inline-flex items-center rounded-council border border-border-strong/60 bg-accent-soft/40 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent-strong">
          {status}
        </span>
      )}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  );
}

function CycleSwitch({
  value,
  onChange,
}: {
  value: BillingCycle;
  onChange: (next: BillingCycle) => void;
}) {
  return (
    <div className="inline-flex w-fit rounded-council border border-border-strong/60 bg-surface/80 p-1 text-xs font-medium">
      {(["monthly", "annual"] as const).map((cycle) => {
        const isActive = cycle === value;
        const label = cycle === "monthly" ? "Mensual" : "Anual · 2 meses gratis";
        return (
          <button
            key={cycle}
            type="button"
            onClick={() => onChange(cycle)}
            className={`rounded-council px-4 py-1.5 transition ${
              isActive
                ? "bg-accent text-accent-foreground shadow-soft"
                : "text-foreground-soft hover:text-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function PricingCard({
  plan,
  cycle,
  currentPlan,
  pending,
  onSelect,
}: {
  plan: PlanId;
  cycle: BillingCycle;
  currentPlan: PlanId;
  pending: boolean;
  onSelect: () => void;
}) {
  const definition = PLANS[plan];
  const price =
    cycle === "monthly"
      ? definition.pricing.monthly
      : definition.pricing.annual;
  if (!price) return null;

  const isCurrent = currentPlan === plan;
  const isRecommended = Boolean(definition.copy.badge);
  const discount =
    cycle === "annual" ? definition.pricing.annual?.discountPct ?? null : null;

  return (
    <article
      className={`flex h-full min-h-[27rem] flex-col rounded-council border bg-surface/90 p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-council ${
        isRecommended
          ? "border-[#d9784c]/45 bg-[linear-gradient(145deg,rgba(255,250,244,0.96),rgba(255,240,226,0.82))]"
          : "border-border-strong/60"
      }`}
    >
      <header className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-foreground">
          {definition.copy.name}
        </h4>
        {definition.copy.badge && (
          <span className="rounded-full border border-[#d9784c]/25 bg-[#fff0e5]/90 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-accent-strong">
            {definition.copy.badge}
          </span>
        )}
      </header>
      <div className="mt-5">
        <p className="text-3xl font-semibold text-foreground">
          ${price.amountMxn.toLocaleString("es-MX")}{" "}
          <span className="text-base font-normal text-muted">
            MXN / {cycle === "monthly" ? "mes" : "año"}
          </span>
        </p>
        {discount && (
          <p className="mt-1 text-xs font-medium text-accent">
            Ahorra ~{discount}% vs pago mensual
          </p>
        )}
      </div>
      <p className="mt-5 text-sm text-muted">{definition.copy.tagline}</p>
      <ul className="mt-5 grid flex-1 content-start gap-2.5 text-sm text-foreground">
        {definition.copy.features.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <span
              aria-hidden
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant={isCurrent ? "secondary" : "primary"}
        onClick={onSelect}
        disabled={pending || isCurrent}
        className="mt-6 h-12 w-full"
      >
        {isCurrent
          ? "Es tu plan actual"
          : pending
            ? "Redirigiendo a Stripe…"
            : `Suscribirme a ${definition.copy.name}`}
      </Button>
    </article>
  );
}

function PlanUpgradeLink({ currentPlan }: { currentPlan: PlanId }) {
  if (currentPlan !== "plus") return null;
  return (
    <a
      href="#upgrade-pro"
      className="inline-flex items-center self-center text-xs uppercase tracking-wider text-muted underline-offset-4 hover:text-accent hover:underline"
    >
      Comparar con Pro
    </a>
  );
}
