import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export const metadata = {
  title: "Soporte · COUNCILia",
  description:
    "Preguntas frecuentes sobre paywall, borrado de datos, modo soporte, exportación y privacidad.",
};

interface FAQ {
  q: string;
  a: string;
}

/**
 * R7 · FAQ cubre paywall, borrado, modo Soporte, exportación, cookies y privacidad.
 */
const FAQS: FAQ[] = [
  {
    q: "¿COUNCILia me recomienda qué hacer?",
    a: "No. El council deliberativo nombra tradeoffs, no recomienda. La síntesis enumera caminos visibles y las tensiones irreductibles entre ellos. La decisión final siempre es del usuario (Principio 5).",
  },
  {
    q: "¿Cómo funciona el tier gratuito y cuándo aparece el paywall?",
    a: "El tier gratuito incluye 5 sesiones por mes natural. Al intentar abrir la sexta sesión del mes verás la pantalla de paywall con la opción de pasar a Pro. Una sesión se cuenta cuando envías el primer mensaje al council; abrir y no escribir no consume tu cuota.",
  },
  {
    q: "¿Qué pasa si la conversación entra en una zona emocional muy difícil?",
    a: "Si detectamos señales de crisis emocional aguda, ideación suicida o autolesión, el flujo deliberativo se suspende y entrega recursos profesionales verificados (Modo Soporte, Principio 9). El council no delibera sobre la crisis: tu salud está por encima del producto.",
  },
  {
    q: "¿Puedo exportar la síntesis?",
    a: "Sí. Desde la síntesis puedes copiarla como markdown limpio o imprimirla a PDF con el diálogo nativo del navegador (estilo de impresión optimizado).",
  },
  {
    q: "¿Cómo borro mis datos o cierro mi cuenta?",
    a: "Desde Ajustes → Privacidad puedes descargar tus datos en formato JSON, borrar una conversación, borrar todo el historial o cerrar la cuenta. Los borrados disparan un job que elimina los datos físicamente del sistema (incluyendo backups) dentro de los 7 días siguientes (SLA documentado).",
  },
  {
    q: "¿Qué cookies usa COUNCILia?",
    a: "Solo las estrictamente necesarias se cargan por defecto. Las funcionales y analíticas requieren tu consentimiento explícito y puedes ajustarlas desde el centro de preferencias en /cookies.",
  },
  {
    q: "¿Por qué solo 3 agentes y no 4?",
    a: "Las tres funciones objetivo (largo plazo, riesgo, supuestos) son estructuralmente incompatibles: garantizan tensión sin necesidad de un cuarto. Tres burbujas caben en una pantalla móvil y reduce 25% el costo de Claude por sesión. Sofía (la Creativa) llegará a v1.2 cuando tengamos datos que justifiquen su existencia (Principio 10).",
  },
  {
    q: "¿Mis conversaciones se usan para entrenar modelos?",
    a: "No. Tus conversaciones no se utilizan para entrenar modelos propios ni de terceros. Ver Política de Privacidad para el detalle de procesamiento por Anthropic en cumplimiento de su política de zero data retention para integraciones API.",
  },
];

export default function SupportPage() {
  return (
    <>
      <Header />
      <main>
        <section className="border-b border-border/60 py-16 md:py-20">
          <Container className="max-w-3xl">
            <Link
              href="/"
              className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
            >
              ← Inicio
            </Link>
            <p className="mt-6 text-xs font-medium uppercase tracking-widest text-accent">
              Soporte
            </p>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Preguntas frecuentes
            </h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted">
              Respuestas concretas a las dudas más comunes. Si no encuentras la
              tuya, escríbenos a{" "}
              <a
                href="mailto:hola@councilia.app"
                className="text-accent underline-offset-4 hover:underline"
              >
                hola@councilia.app
              </a>
              .
            </p>
          </Container>
        </section>

        <section className="py-16 md:py-20">
          <Container className="max-w-3xl">
            <ul className="flex flex-col divide-y divide-border/60">
              {FAQS.map((f, i) => (
                <li key={i} className="py-6">
                  <details className="group">
                    <summary className="flex cursor-pointer items-center justify-between gap-6 text-base font-medium text-foreground">
                      <span>{f.q}</span>
                      <span
                        aria-hidden
                        className="font-mono text-xs text-muted transition group-open:rotate-180"
                      >
                        ↓
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {f.a}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
