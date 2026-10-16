import { UserRole } from '@prisma/client-runtime-v2';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        status: string;
      };
      accessToken?: { jti?: string; expiresAt?: Date };
    }
  }
}
