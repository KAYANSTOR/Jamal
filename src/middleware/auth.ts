import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users, organizations } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: typeof users.$inferSelect;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    
    // Auto-create a default org if none exists (for prototyping)
    const defaultOrgId = 'org_default';
    const orgs = await db.select().from(organizations).where(eq(organizations.id, defaultOrgId));
    if (orgs.length === 0) {
      await db.insert(organizations).values({
        id: defaultOrgId,
        name: 'Default Organization',
      }).onConflictDoNothing();
    }
    
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.uid, decodedToken.uid));
    let dbUser;

    if (existingUser.length === 0) {
      const newUserId = uuidv4();
      const insertResult = await db.insert(users).values({
        id: newUserId,
        uid: decodedToken.uid,
        organizationId: defaultOrgId,
        email: decodedToken.email || '',
        name: decodedToken.name || '',
        role: 'ADMIN', // First user could be admin
      }).returning();
      dbUser = insertResult[0];
    } else {
      dbUser = existingUser[0];
    }
    
    req.dbUser = dbUser;
    
    if (dbUser.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requirePermission = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.dbUser.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }
    next();
  };
};

