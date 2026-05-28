import "server-only";

export type E2eScenario =
  | "free_second_chat"
  | "plus_eleventh_chat"
  | "free_sixth_message";

export function isE2eEnabled(): boolean {
  return process.env.E2E_TEST_MODE === "1";
}

export function requireE2eSecret(request: Request): void {
  if (!isE2eEnabled()) {
    throw new E2eConfigError("E2E_TEST_MODE no está activo.", 404);
  }
  const expected = process.env.E2E_TEST_SECRET;
  if (!expected) {
    throw new E2eConfigError("Falta E2E_TEST_SECRET en el entorno.", 503);
  }
  const provided = request.headers.get("x-e2e-secret");
  if (provided !== expected) {
    throw new E2eConfigError("Secreto E2E inválido.", 403);
  }
}

export function requireE2eCredentials(): { email: string; password: string } {
  const email = process.env.E2E_TEST_EMAIL?.trim();
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new E2eConfigError(
      "Configura E2E_TEST_EMAIL y E2E_TEST_PASSWORD en .env.local.",
      503,
    );
  }
  return { email, password };
}

export class E2eConfigError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "E2eConfigError";
    this.status = status;
  }
}
