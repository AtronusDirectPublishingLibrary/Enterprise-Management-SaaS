CREATE TABLE "mfa_recovery_code" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mfa_recovery_code_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mfa_recovery_code_user_id_code_hash_key" ON "mfa_recovery_code"("user_id", "code_hash");
CREATE INDEX "mfa_recovery_code_user_id_used_at_idx" ON "mfa_recovery_code"("user_id", "used_at");

CREATE TABLE "webauthn_credential" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "credential_id" TEXT NOT NULL,
  "public_key" TEXT NOT NULL,
  "counter" INTEGER NOT NULL DEFAULT 0,
  "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "device_type" TEXT NOT NULL DEFAULT 'singleDevice',
  "backed_up" BOOLEAN NOT NULL DEFAULT false,
  "name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMP(3),
  CONSTRAINT "webauthn_credential_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "webauthn_credential_credential_id_key" ON "webauthn_credential"("credential_id");
CREATE INDEX "webauthn_credential_user_id_idx" ON "webauthn_credential"("user_id");

CREATE TABLE "webauthn_challenge" (
  "id" TEXT NOT NULL,
  "challenge" TEXT NOT NULL,
  "user_id" TEXT,
  "kind" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webauthn_challenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "webauthn_challenge_challenge_key" ON "webauthn_challenge"("challenge");
CREATE INDEX "webauthn_challenge_expires_at_idx" ON "webauthn_challenge"("expires_at");

ALTER TABLE "mfa_recovery_code" ADD CONSTRAINT "mfa_recovery_code_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webauthn_credential" ADD CONSTRAINT "webauthn_credential_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
