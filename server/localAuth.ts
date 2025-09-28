import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { RequestHandler } from "express";
import * as client from "openid-client";

// Configure passport-local strategy
export function setupLocalAuth() {
  const localStrategy = new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        console.log('[LOCAL_AUTH] Attempting login for email:', email);
        
        // Find user by email with authProvider='local'
        const users = await storage.getUsersByEmailAndAuthProvider(email.toLowerCase(), 'local');
        
        if (!users || users.length === 0) {
          console.log('[LOCAL_AUTH] No user found with email:', email);
          return done(null, false, { message: 'Invalid email or password' });
        }
        
        const user = users[0];
        
        // Check if user has a password hash (required for local auth)
        if (!user.passwordHash) {
          console.log('[LOCAL_AUTH] User has no password hash');
          return done(null, false, { message: 'Invalid email or password' });
        }
        
        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        
        if (!isValid) {
          console.log('[LOCAL_AUTH] Invalid password for user:', email);
          return done(null, false, { message: 'Invalid email or password' });
        }
        
        console.log('[LOCAL_AUTH] Successful login for user:', email);
        
        // Create user object for session with authType
        const sessionUser = {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          authType: 'local' as const,
          authProvider: 'local' as const
        };
        
        return done(null, sessionUser);
      } catch (error) {
        console.error('[LOCAL_AUTH] Error during authentication:', error);
        return done(error);
      }
    }
  );
  
  passport.use('local', localStrategy);
}

// Registration handler for creating new local users
export const registerLocalUser: RequestHandler = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Check if user already exists
    const existingUsers = await storage.getUsersByEmailAndAuthProvider(email.toLowerCase(), 'local');
    
    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const user = await storage.upsertUser({
      email: email.toLowerCase(),
      firstName,
      lastName,
      authProvider: 'local',
      passwordHash,
      emailVerified: true // For simplicity, auto-verify. In production, send verification email
    });
    
    res.status(201).json({ 
      message: 'User created successfully', 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('[LOCAL_AUTH] Registration error:', error);
    res.status(500).json({ message: 'Failed to register user' });
  }
};

// Local login handler
export const loginLocal: RequestHandler = (req, res, next) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ message: 'Authentication error' });
    }
    
    if (!user) {
      return res.status(401).json({ message: info?.message || 'Invalid credentials' });
    }
    
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Login failed' });
      }
      
      res.json({ 
        message: 'Login successful',
        user: {
          id: user.userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          authType: user.authType
        }
      });
    });
  })(req, res, next);
};

// Note: The unified authentication middleware (isAuthenticatedAny) and helper functions
// (getAuthenticatedUserId) are exported from server/replitAuth.ts to avoid duplication