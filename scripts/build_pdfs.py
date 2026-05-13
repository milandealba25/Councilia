"""
Genera los PDFs temáticos de COUNCILia a partir de los archivos MD en `docs/`.
Cada PDF es autocontenido y usa el mismo motor editorial (pdf_builder).

Uso:
    python3 scripts/build_pdfs.py
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List

from pdf_builder import DocConfig, build_pdf


# --------------------------------------------------------------------------- #
# Definición de los documentos del build
# --------------------------------------------------------------------------- #

@dataclass
class DocSpec:
    md: str            # ruta al markdown fuente (relativa al repo)
    pdf: str           # ruta al PDF resultante (relativa al repo)
    short_label: str   # etiqueta corta para header del cuerpo
    cover_subtitle: str
    cover_tagline: str
    cover_items: List[str]


DOCS: List[DocSpec] = [
    DocSpec(
        md="docs/01_vision.md",
        pdf="pdfs/01_Vision.pdf",
        short_label="01 · Visión",
        cover_subtitle="Visión y Propuesta de Valor",
        cover_tagline="Qué es COUNCILia, por qué existe y qué promete.",
        cover_items=[
            "Qué es COUNCILia",
            "Los tres problemas que resuelve",
            "Promesa central",
            "Qué NO es",
            "Diferenciador defendible",
        ],
    ),
    DocSpec(
        md="docs/02_scope_mvp.md",
        pdf="pdfs/02_Scope_MVP.pdf",
        short_label="02 · Scope del MVP",
        cover_subtitle="Scope del MVP",
        cover_tagline="Qué entra al sprint, qué se pospone y por qué.",
        cover_items=[
            "Punto de partida",
            "Lo que conservamos del MVP original",
            "Lo que recortamos del README",
            "Tabla maestra de decisiones",
            "Cómo aplicarla en un dilema concreto",
        ],
    ),
    DocSpec(
        md="docs/03_encuesta_onboarding.md",
        pdf="pdfs/03_Encuesta_Onboarding.pdf",
        short_label="03 · Onboarding",
        cover_subtitle="Encuesta de Onboarding",
        cover_tagline="Cómo entra el usuario y cómo se calibra el council.",
        cover_items=[
            "Por qué hay encuesta",
            "Las 4 preguntas",
            "Por qué cada pregunta importa",
            "El objeto userContext",
            "Notas de diseño",
            "Lo que NO entra al MVP",
        ],
    ),
    DocSpec(
        md="docs/04_agentes.md",
        pdf="pdfs/04_Agentes.pdf",
        short_label="04 · Agentes",
        cover_subtitle="Los 3 Agentes del Council",
        cover_tagline="Marco, Elena y Rafael: función, tono y límites.",
        cover_items=[
            "Principio rector",
            "MARCO — El Estratega",
            "ELENA — La Analista de Riesgo",
            "RAFAEL — El Crítico",
            "Por qué exactamente estos tres",
            "Composición del system prompt",
            "Reglas comunes y atenuación",
        ],
    ),
    DocSpec(
        md="docs/05_flujo_orquestacion.md",
        pdf="pdfs/05_Flujo_Orquestacion.pdf",
        short_label="05 · Flujo",
        cover_subtitle="Flujo Conversacional y Orquestación",
        cover_tagline="Fases, reglas duras y síntesis con tradeoffs.",
        cover_items=[
            "Forma del flujo (4 fases)",
            "Reglas duras de orquestación",
            "Síntesis con tradeoffs explícitos",
            "Comportamientos especiales",
            "Métricas de salud del flujo",
        ],
    ),
    DocSpec(
        md="docs/06_stack_tecnologia.md",
        pdf="pdfs/06_Stack_Tecnologia.pdf",
        short_label="06 · Stack",
        cover_subtitle="Stack Tecnológico y Arquitectura",
        cover_tagline="Tecnologías, orquestador propio y modelo de datos.",
        cover_items=[
            "Criterios de selección",
            "Stack completo",
            "Por qué orquestador propio",
            "Componentes del orquestador custom",
            "Modelo de datos",
            "Decisiones que se posponen",
            "Riesgos técnicos conocidos",
        ],
    ),
    DocSpec(
        md="docs/07_operaciones.md",
        pdf="pdfs/07_Operaciones.pdf",
        short_label="07 · Operaciones",
        cover_subtitle="Operaciones",
        cover_tagline="Costos, modelo de negocio, contenido sensible y métricas.",
        cover_items=[
            "Costo por sesión",
            "Modelo de negocio",
            "Política de contenido sensible",
            "Métricas de validación",
            "Hipótesis de validación",
        ],
    ),
    DocSpec(
        md="docs/08_roadmap.md",
        pdf="pdfs/08_Roadmap.pdf",
        short_label="08 · Roadmap",
        cover_subtitle="Roadmap MVP y Post-MVP",
        cover_tagline="Las 8 semanas y la visión v1.2 → v1.4+.",
        cover_items=[
            "Roadmap MVP — 8 semanas",
            "Entregables de cierre",
            "Riesgos del cronograma",
            "Roadmap post-MVP (v1.2 / v1.3 / v1.4+)",
            "Reglas de admisión al roadmap",
        ],
    ),
    DocSpec(
        md="docs/09_principios.md",
        pdf="pdfs/09_Principios.pdf",
        short_label="09 · Principios",
        cover_subtitle="Principios Irrenunciables",
        cover_tagline="Los diez principios que sostienen el producto.",
        cover_items=[
            "Para qué sirve este documento",
            "Los diez principios",
            "Cómo se aplica en la práctica",
        ],
    ),
    DocSpec(
        md="docs/10_terminos_y_condiciones.md",
        pdf="pdfs/10_Terminos_y_Condiciones.pdf",
        short_label="10 · Términos y Condiciones",
        cover_subtitle="Términos y Condiciones",
        cover_tagline="Qué te pedimos, qué guardamos, qué te prometemos y qué no.",
        cover_items=[
            "Resumen en una página",
            "Aceptación y descripción del Servicio",
            "Quién puede usar el Servicio",
            "Uso aceptable",
            "Qué información recopilamos y por qué",
            "Cómo guardamos y protegemos tu información",
            "Tus derechos sobre tu información",
            "Propiedad intelectual",
            "Limitaciones de responsabilidad",
            "Suscripción, pagos y reembolsos",
            "Cierre de cuenta y borrado de datos",
            "Cambios, legislación y contacto",
        ],
    ),
    DocSpec(
        md="docs/11_tareas_mvp.md",
        pdf="pdfs/11_Tareas_MVP.pdf",
        short_label="11 · Tareas del MVP",
        cover_subtitle="Lista de Tareas del MVP",
        cover_tagline="Descomposición detallada del trabajo de las 8 semanas.",
        cover_items=[
            "Resumen por semana",
            "Setup e infraestructura",
            "Diseño, frontend y agentes",
            "Backend, orquestador y datos",
            "Modo Soporte y pagos",
            "Instrumentación y testing",
            "DevOps y legal",
            "Validación con usuarios",
            "Hitos críticos y dependencias",
        ],
    ),
    DocSpec(
        md="docs/12_politica_de_privacidad.md",
        pdf="pdfs/12_Politica_de_Privacidad.pdf",
        short_label="12 · Privacidad",
        cover_subtitle="Política de Privacidad",
        cover_tagline="Qué datos tratamos, por qué, con quién y tus derechos.",
        cover_items=[
            "Responsable y ámbito",
            "Principios y categorías de datos",
            "Finalidades y bases legales",
            "Encargados y transferencias",
            "Conservación y seguridad",
            "Derechos del titular",
            "Menores, analítica y cookies",
            "California, México y contacto",
        ],
    ),
    DocSpec(
        md="docs/13_politica_de_cookies.md",
        pdf="pdfs/13_Politica_de_Cookies.pdf",
        short_label="13 · Cookies",
        cover_subtitle="Política de Cookies",
        cover_tagline="Qué cookies usamos, para qué sirven y cómo gestionarlas.",
        cover_items=[
            "Qué son las cookies",
            "Consentimiento y clasificación",
            "Tabla first-party y third-party",
            "Finalidades por categoría",
            "Control desde el navegador",
            "Conservación y actualizaciones",
        ],
    ),
    DocSpec(
        md="docs/14_manual_tareas_operador_desarrollo.md",
        pdf="pdfs/14_Manual_Tareas_Operador_Desarrollo.pdf",
        short_label="14 · Manual operador",
        cover_subtitle="Tareas manuales",
        cover_tagline="Checklist de lo que debe hacer una persona fuera del código.",
        cover_items=[
            "Prioridades crítica a baja",
            "Anthropic y entorno local",
            "Supabase y migración SQL",
            "Vercel y DNS",
            "Correo, GitHub, Stripe",
            "Legal y usuarios pilotos",
            "Comandos útiles del repo",
        ],
    ),
]


# --------------------------------------------------------------------------- #
# Build
# --------------------------------------------------------------------------- #

def _make_cfg(spec: DocSpec) -> DocConfig:
    return DocConfig(
        cover_title="COUNCILia",
        cover_subtitle=spec.cover_subtitle,
        cover_tagline=spec.cover_tagline,
        cover_top_left="C O U N C I L I A",
        cover_top_right=f"MVP v1.1 · {spec.short_label}",
        cover_items=list(spec.cover_items),
        cover_footer_top="Serie del MVP v1.1 · Documento autocontenido",
        cover_footer_bottom="Versión 1.1 · 2026",
        body_header_left=f"COUNCILia · {spec.short_label}",
        body_header_right=spec.cover_subtitle,
        body_footer_left="COUNCILia · 2026",
        pdf_title=f"COUNCILia – {spec.cover_subtitle}",
        pdf_author="COUNCILia",
        pdf_subject=spec.cover_subtitle,
    )


def main() -> None:
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)

    out_dir = os.path.join(root, "pdfs")
    os.makedirs(out_dir, exist_ok=True)

    for spec in DOCS:
        md_path = os.path.join(root, spec.md)
        pdf_path = os.path.join(root, spec.pdf)
        build_pdf(md_path, pdf_path, _make_cfg(spec))


if __name__ == "__main__":
    main()
