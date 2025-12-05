import type { Express } from "express";
import { type Server } from "http";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Resend } from "resend";
import { storage } from "./storage";
import { insertUserSchema, insertAddressSchema, insertFallbackContactSchema, companyRegistrationSchema } from "@shared/schema";
import { calculateDistanceKm } from "@shared/utils";
import { z } from "zod";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const SALT_ROUNDS = 10;

const MAX_FREE_DISTANCE_KM = 3;

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(httpServer: Server, app: Express) {

  // Helper to check auth
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // --- Auth Routes ---

  app.post("/api/register", async (req, res) => {
    try {
      // 1. Validate User Data
      const userData = insertUserSchema.parse(req.body);

      // 2. Check Duplicates (only for individual accounts with iqamaId)
      if (userData.iqamaId) {
        const existingIqama = await storage.getUserByIqama(userData.iqamaId);
        if (existingIqama) return res.status(400).json({ message: "ID already registered" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) return res.status(400).json({ message: "Email already registered" });

      const existingPhone = await storage.getUserByPhone(userData.phone);
      if (existingPhone) return res.status(400).json({ message: "Phone already registered" });

      // 3. Hash password and create User
      const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
      const newUser = await storage.createUser({ ...userData, password: hashedPassword });

      // 4. Create Address if provided
      let newAddress = null;
      if (req.body.textAddress && req.body.textAddress.length >= 10) {
        // Validate address part
        const addressData = insertAddressSchema.parse({
          ...req.body,
          userId: newUser.id,
          digitalId: generateDigitalId() 
        });
        newAddress = await storage.createAddress(addressData);
      }

      // 5. Login
      req.session.userId = newUser.id;
      
      res.status(201).json({ user: newUser, address: newAddress });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation Error", errors: error.errors });
      } else {
        console.error("Register Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // Company Registration
  app.post("/api/register/company", async (req, res) => {
    try {
      // 1. Validate company data
      const companyData = companyRegistrationSchema.parse(req.body);

      // 2. Check duplicates
      const existingUnified = await storage.getCompanyProfileByUnifiedNumber(companyData.unifiedNumber);
      if (existingUnified) return res.status(400).json({ message: "Unified number already registered" });

      const existingEmail = await storage.getUserByEmail(companyData.email);
      if (existingEmail) return res.status(400).json({ message: "Email already registered" });

      const existingPhone = await storage.getUserByPhone(companyData.phone);
      if (existingPhone) return res.status(400).json({ message: "Mobile number already registered" });

      // 3. Hash password and create user
      const hashedPassword = await bcrypt.hash(companyData.password, SALT_ROUNDS);
      const newUser = await storage.createUser({
        accountType: "company",
        iqamaId: null,
        email: companyData.email,
        phone: companyData.phone,
        name: companyData.companyName,
        password: hashedPassword,
      });

      // 4. Create company profile
      const companyProfile = await storage.createCompanyProfile({
        userId: newUser.id,
        companyName: companyData.companyName,
        unifiedNumber: companyData.unifiedNumber,
        companyType: companyData.companyType,
      });

      // 5. Login
      req.session.userId = newUser.id;

      res.status(201).json({ user: newUser, companyProfile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation Error", errors: error.errors });
      } else {
        console.error("Company Register Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.post("/api/login", async (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ message: "Missing credentials" });

    // Find user by Email OR ID
    let user = await storage.getUserByEmail(identifier);
    if (!user) user = await storage.getUserByIqama(identifier);
    
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // Check if password is hashed (bcrypt hashes start with $2b$ or $2a$)
    const isHashedPassword = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
    
    let passwordMatch = false;
    if (isHashedPassword) {
      // Compare with bcrypt
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // Legacy plaintext password - compare directly
      passwordMatch = user.password === password;
      
      // Migrate to hashed password on successful login
      if (passwordMatch) {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        await storage.updateUserPassword(user.id, hashedPassword);
      }
    }
    
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Login
    req.session.userId = user.id;
    res.json({ user });
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });

  // Session ping endpoint - keeps session alive when user is active
  app.post("/api/session/ping", requireAuth, (req, res) => {
    // Session is automatically extended by express-session with rolling: true
    res.json({ success: true });
  });

  // --- Password Reset Routes (OTP-based) ---

  app.post("/api/send-reset-otp", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });

      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        // Return success even if user doesn't exist (security best practice)
        return res.json({ message: "If an account exists with this email, an OTP will be sent.", success: true });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await storage.createPasswordResetOtp(user.id, email, otp, expiresAt);

      // Send email with OTP (or log in dev mode if email service not configured)
      if (!resend) {
        console.log(`[DEV MODE] Password reset OTP for ${email}: ${otp}`);
        return res.json({ message: "OTP sent to your email", success: true });
      }

      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject: 'Your Password Reset Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Code</h2>
            <p>Hello ${user.name},</p>
            <p>Your password reset code is:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${otp}</span>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });

      if (error) {
        console.error("Email send error:", error);
        // Still allow the flow to continue, just log the error
        console.log(`[FALLBACK] Password reset OTP for ${email}: ${otp}`);
      }

      res.json({ message: "OTP sent to your email", success: true });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const resetOtp = await storage.getValidOtp(email, otp);
      
      if (!resetOtp) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email, otp, password } = req.body;
      
      if (!email || !otp || !password) {
        return res.status(400).json({ message: "Email, OTP, and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const resetOtp = await storage.getValidOtp(email, otp);
      
      if (!resetOtp) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Hash new password and update user
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      await storage.updateUserPassword(resetOtp.userId, hashedPassword);
      
      // Mark OTP as used
      await storage.markOtpAsUsed(resetOtp.id);

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/user", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const addresses = await storage.getAddressesByUserId(user.id);
    res.json({ ...user, addresses });
  });

  // --- Address Routes ---

  app.post("/api/addresses", requireAuth, async (req, res) => {
    try {
      // Check if user already has addresses
      const existingAddresses = await storage.getAddressesByUserId(req.session.userId!);
      const isFirstAddress = existingAddresses.length === 0;

      const addressData = insertAddressSchema.parse({
        ...req.body,
        userId: req.session.userId,
        digitalId: generateDigitalId(),
        isPrimary: isFirstAddress // First address is automatically primary
      });

      const newAddress = await storage.createAddress(addressData);
      res.status(201).json(newAddress);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation Error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });
  
  // Set primary address
  app.post("/api/addresses/:id/set-primary", requireAuth, async (req, res) => {
    try {
      const addressId = parseInt(req.params.id);
      if (isNaN(addressId)) {
        return res.status(400).json({ message: "Invalid address ID" });
      }

      // Verify ownership
      const address = await storage.getAddressById(addressId);
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }
      if (address.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Clear primary flag on all user's addresses, then set this one as primary
      await storage.clearPrimaryAddresses(req.session.userId!);
      const updated = await storage.updateAddress(addressId, { isPrimary: true });
      
      res.json(updated);
    } catch (error) {
      console.error("Set primary address error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.patch("/api/addresses/:id", requireAuth, async (req, res) => {
    const addressId = parseInt(req.params.id);
    const updates = req.body;
    
    const updated = await storage.updateAddress(addressId, updates);
    if (!updated) return res.status(404).json({ message: "Address not found" });
    
    res.json(updated);
  });

  app.delete("/api/addresses/:id", requireAuth, async (req, res) => {
    try {
      const addressId = parseInt(req.params.id);
      if (isNaN(addressId)) {
        return res.status(400).json({ message: "Invalid address ID" });
      }

      // Verify ownership
      const address = await storage.getAddressById(addressId);
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }
      if (address.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to delete this address" });
      }

      // Delete associated fallback contacts first
      await storage.deleteFallbackContactsByAddressId(addressId);
      
      // Delete the address
      const deleted = await storage.deleteAddress(addressId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete address" });
      }

      res.json({ message: "Address deleted successfully" });
    } catch (error) {
      console.error("Delete address error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // --- Fallback Contact Routes ---
  app.post("/api/fallback-contacts", requireAuth, async (req, res) => {
    try {
      const contactData = insertFallbackContactSchema.parse(req.body);
      
      // Strict validation for lat/lng - ensure they are valid finite numbers
      if (!Number.isFinite(contactData.lat) || !Number.isFinite(contactData.lng)) {
        return res.status(400).json({ 
          message: "Please select a location on the map for the fallback contact." 
        });
      }
      
      // Fetch the primary address to calculate distance
      const primaryAddress = await storage.getAddressById(contactData.addressId);
      if (!primaryAddress) {
        return res.status(400).json({ message: "Primary address not found" });
      }

      // Primary address must have coordinates for distance calculation
      if (!primaryAddress.lat || !primaryAddress.lng) {
        return res.status(400).json({ message: "Primary address does not have location data" });
      }

      // Calculate distance using server-side trusted coordinates
      const computedDistance = calculateDistanceKm(
        primaryAddress.lat,
        primaryAddress.lng,
        contactData.lat,
        contactData.lng
      );
      const requiresExtraFee = computedDistance > MAX_FREE_DISTANCE_KM;

      // If distance exceeds 3km, enforce scheduling and fee acknowledgment with strict validation
      if (requiresExtraFee) {
        // Zod already trims, so check for non-empty after trim
        const hasScheduledDate = contactData.scheduledDate && contactData.scheduledDate.length > 0;
        const hasScheduledTimeSlot = contactData.scheduledTimeSlot && contactData.scheduledTimeSlot.length > 0;
        
        if (!hasScheduledDate || !hasScheduledTimeSlot) {
          return res.status(400).json({ 
            message: "Fallback locations beyond 3km require scheduled delivery date and time slot." 
          });
        }
        if (contactData.extraFeeAcknowledged !== true) {
          return res.status(400).json({ 
            message: "Please acknowledge the extra delivery fee for locations beyond 3km." 
          });
        }
      }

      // Create the fallback contact with server-computed distance (ignore client-sent values)
      const finalContactData = {
        ...contactData,
        distanceKm: computedDistance,
        requiresExtraFee,
      };

      const newContact = await storage.createFallbackContact(finalContactData);
      res.status(201).json(newContact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation Error", errors: error.errors });
      } else {
        console.error("Create fallback contact error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.get("/api/fallback-contacts/:addressId", requireAuth, async (req, res) => {
    const addressId = parseInt(req.params.addressId);
    const contacts = await storage.getFallbackContactsByAddressId(addressId);
    res.json(contacts);
  });

  app.get("/api/fallback-contact/:id", requireAuth, async (req, res) => {
    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }
    const contact = await storage.getFallbackContactById(contactId);
    if (!contact) {
      return res.status(404).json({ message: "Fallback contact not found" });
    }
    res.json(contact);
  });

  // --- Public Address View Route (no auth required) ---
  app.get("/api/address/:digitalId", async (req, res) => {
    try {
      const { digitalId } = req.params;
      const address = await storage.getAddressByDigitalId(digitalId);
      
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }

      // Get the user info (without sensitive data)
      const user = await storage.getUser(address.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return public-safe user info
      res.json({
        address,
        user: {
          name: user.name,
          phone: user.phone,
          email: user.email
        }
      });
    } catch (error) {
      console.error("Fetch address error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  return httpServer;
}

function generateDigitalId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
