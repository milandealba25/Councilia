# Stripe en COUNCILia (test mode)

> Catálogo creado en sandbox `COUNCILia sandbox` (`acct_1TbiSTD4vaSeAbPk`).
> Todo lo de este documento se hizo con claves `pk_test_…` / `sk_test_…`.

---

## 1. Catálogo en Stripe

### Productos

| Plan | Product ID | Marketing features | Metadata clave |
|------|------------|---------------------|----------------|
| Councilia Plus | `prod_Uavokl8w4r9bGy` | 10 chats simultáneos · 20 msgs/chat · historial 10 · GPT-4o-mini · voz · síntesis | `plan=plus`, `max_active_chats=10`, `llm_model=gpt-4o-mini` |
| Councilia Pro  | `prod_Uavomov1AtpedL` | Chats e historial ilimitados · GPT-4o-mini + síntesis GPT-4o · voz · exportar · prioridad | `plan=pro`, `max_active_chats=unlimited`, `synthesis_model=gpt-4o` |

Ambos comparten:
- `tax_code = txcd_10000000` (SaaS)
- `statement_descriptor` específico (visible en el estado de cuenta del cliente)
- URL pública del producto

### Precios (recurrentes, MXN, `tax_behavior = inclusive`)

| Plan | Ciclo | Monto | Price ID | Lookup key |
|------|-------|------:|----------|------------|
| Plus | Mensual (default) | 79 MXN | `price_1TbjxmD4vaSeAbPknyWqFkPk` | `councilia_plus_monthly_mxn` |
| Plus | Anual | 790 MXN | `price_1TbjxnD4vaSeAbPkEZty299Z` | `councilia_plus_annual_mxn` |
| Pro  | Mensual (default) | 199 MXN | `price_1TbjxpD4vaSeAbPkf9oYAamX` | `councilia_pro_monthly_mxn` |
| Pro  | Anual | 1 990 MXN | `price_1TbjxpD4vaSeAbPkmCEiFyDj` | `councilia_pro_annual_mxn` |

> El plan anual equivale a 10 mensualidades (~17% descuento).
> El precio mensual está marcado como `default_price` de cada producto.

### Payment Links de test (compartibles)

| Plan / ciclo | URL |
|--------------|-----|
| Plus mensual | https://buy.stripe.com/test_5kQ28q9zM6bG7qtftVafS00 |
| Plus anual   | https://buy.stripe.com/test_00w6oG9zMeIc6mp81tafS01 |
| Pro mensual  | https://buy.stripe.com/test_14A28q5jweIccKNgxZafS02 |
| Pro anual    | https://buy.stripe.com/test_00wcN4bHUarWcKNbdFafS03 |

Sirven para probar pagos sin necesidad de la app. Usa tarjetas de [test cards](https://docs.stripe.com/testing) como `4242 4242 4242 4242`.

---

## 2. Integración en el código

```
lib/billing/
  plans.ts          ← Catálogo (UI + límites + lookup keys)
  stripe.ts         ← Cliente Stripe lazy
  customer.ts       ← ensureStripeCustomer(userId)
  subscription.ts   ← normalizeSubscription(...)
  repository.ts     ← getters / setters Supabase (service-role)

app/api/billing/
  status/route.ts   ← GET  → plan actual, ciclo, próxima renovación
  checkout/route.ts ← POST → crea Checkout Session por lookup_key
  portal/route.ts   ← POST → crea Customer Portal session

app/api/webhooks/stripe/route.ts
  POST → valida firma, idempotencia en `billing_events`, sincroniza
         `users.plan` y `users.subscription_*` con la suscripción.

components/billing/BillingPanel.tsx
  UI integrada en /account: muestra plan, ciclo, renovación, botón
  para abrir el Customer Portal y pricing cards Plus/Pro.
```

### Tabla `public.users` (migración `006_billing.sql`)

Campos nuevos: `stripe_customer_id`, `stripe_subscription_id`,
`subscription_status`, `subscription_price_id`,
`subscription_billing_cycle`, `subscription_current_period_end`,
`subscription_cancel_at_period_end`.

El `check` de `plan` se amplió a `('free', 'plus', 'pro')`.

### Tabla `public.billing_events`

Idempotencia de webhooks: cada `event.id` solo se procesa una vez.
RLS deniega todo desde el cliente; sólo escribe la service-role.

---

## 3. Setup local

1. Asegúrate de tener en `.env.local`:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
   - `SUPABASE_SERVICE_ROLE_KEY=...` (necesaria para que el webhook escriba).

2. Aplica la migración:

   ```sh
   # Supabase Dashboard → SQL Editor → pegar supabase/migrations/006_billing.sql
   ```

3. Reenvía eventos a tu máquina:

   ```sh
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   Copia el `whsec_...` que imprime y pégalo en `STRIPE_WEBHOOK_SECRET`.

4. `npm run dev`, entra a `/account` y prueba **Suscribirme a Plus / Pro**.
   Tras pagar con `4242 4242 4242 4242` (cualquier fecha futura · cualquier CVC),
   el webhook actualizará `users.plan` y la UI mostrará el plan nuevo.

---

## 4. Customer Portal

El Portal aparece como botón "Gestionar facturación" cuando el usuario
ya tiene `stripe_customer_id`. Si Stripe rechaza la creación, lo más
probable es que falte habilitar el portal en
[Dashboard → Settings → Billing → Customer portal](https://dashboard.stripe.com/test/settings/billing/portal).
Activar al menos:

- Permite cancelar suscripciones (al final del ciclo).
- Permite actualizar método de pago.
- Permite descargar facturas.
- Devolver al usuario a `/account?billing=portal`.

---

## 5. Producción

Cuando llegue el momento:

1. Repite el catálogo con **claves live** (`sk_live_...`) – los IDs serán nuevos.
2. Reusa los `lookup_key` exactos (`councilia_plus_monthly_mxn`, …) para no
   tocar código.
3. Configura el webhook en
   `Dashboard → Developers → Webhooks → Add endpoint` apuntando a
   `https://councilia.app/api/webhooks/stripe`, eligiendo los eventos
   `checkout.session.completed`, `customer.subscription.created/updated/deleted/paused/resumed`.
4. Guarda el nuevo `whsec_...` en las env vars de Vercel.
