CREATE TABLE "RevokedAccessToken" (
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevokedAccessToken_pkey" PRIMARY KEY ("jti")
);

CREATE INDEX "RevokedAccessToken_expiresAt_idx" ON "RevokedAccessToken"("expiresAt");
CREATE INDEX "RevokedAccessToken_userId_idx" ON "RevokedAccessToken"("userId");

ALTER TABLE "RevokedAccessToken"
ADD CONSTRAINT "RevokedAccessToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
