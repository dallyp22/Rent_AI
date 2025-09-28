import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import crypto from "crypto";
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

// Password reset request handler
export const resetPasswordRequest: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user by email with authProvider='local'
    const users = await storage.getUsersByEmailAndAuthProvider(email.toLowerCase(), 'local');
    
    // Always return the same message for security (don't reveal if email exists)
    const successMessage = 'If an account exists for this email, a password reset link has been sent';
    
    if (!users || users.length === 0) {
      console.log('[LOCAL_AUTH] No local user found with email:', email);
      // Return success message anyway to avoid revealing if email exists
      return res.json({ 
        message: successMessage,
        // In testing, don't include token since user doesn't exist
        testing: { note: 'User not found - no token generated' }
      });
    }
    
    const user = users[0];
    
    // Generate secure reset token (32 bytes, hex encoded)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Token expires in 1 hour
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);
    
    // Store the reset token
    await storage.setResetToken(user.id, resetToken, expires);
    
    console.log('[LOCAL_AUTH] Password reset token generated for user:', email);
    
    // In production, you would send an email here
    // For testing, return the token in the response
    res.json({ 
      message: successMessage,
      // Only for testing - remove in production
      testing: {
        resetToken,
        note: 'In production, this token would be sent via email',
        expiresAt: expires.toISOString()
      }
    });
  } catch (error) {
    console.error('[LOCAL_AUTH] Password reset request error:', error);
    res.status(500).json({ message: 'Failed to process password reset request' });
  }
};

// Password reset confirmation handler
export const resetPasswordConfirm: RequestHandler = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required' });
    }
    
    // Find user by reset token (will check expiry automatically)
    const user = await storage.getUserByResetToken(token);
    
    if (!user) {
      console.log('[LOCAL_AUTH] Invalid or expired reset token');
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    // Validate password strength (you could add more validation here)
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Hash the new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update user's password
    await storage.upsertUser({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      authProvider: 'local',
      passwordHash,
      emailVerified: user.emailVerified
    });
    
    // Clear the reset token
    await storage.clearResetToken(user.id);
    
    console.log('[LOCAL_AUTH] Password successfully reset for user:', user.email);
    
    res.json({ 
      message: 'Password has been successfully reset. You can now login with your new password.' 
    });
  } catch (error) {
    console.error('[LOCAL_AUTH] Password reset confirmation error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

// Note: The unified authentication middleware (isAuthenticatedAny) and helper functions
// (getAuthenticatedUserId) are exported from server/replitAuth.ts to avoid duplication