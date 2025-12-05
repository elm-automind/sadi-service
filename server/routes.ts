import type { Express } from "express";
import { type Server } from "http";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Resend } from "resend";
import { storage } from "./storage";
import { 
  insertUserSchema, insertAddressSchema, insertFallbackContactSchema, 
  companyRegistrationSchema, companyAddressFormSchema, subscriptionFormSchema, driverFormSchema, bulkDriverSchema,
  shipmentLookupFormSchema, driverFeedbackFormSchema
} from "@shared/schema";
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

    // Find user by Email, Phone, or Iqama ID
    let user = await storage.getUserByEmail(identifier);
    if (!user) user = await storage.getUserByPhone(identifier);
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

  app.put("/api/fallback-contact/:id", requireAuth, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      if (isNaN(contactId)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }

      const existingContact = await storage.getFallbackContactById(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Fallback contact not found" });
      }

      // Verify the user owns the address this contact belongs to
      const address = await storage.getAddressById(existingContact.addressId);
      if (!address || address.userId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = insertFallbackContactSchema.partial().parse(req.body);
      
      // If lat/lng are being updated, recalculate distance
      if (updateData.lat !== undefined && updateData.lng !== undefined) {
        if (!Number.isFinite(updateData.lat) || !Number.isFinite(updateData.lng)) {
          return res.status(400).json({ 
            message: "Please select a valid location on the map." 
          });
        }

        if (address.lat && address.lng) {
          const computedDistance = calculateDistanceKm(
            address.lat,
            address.lng,
            updateData.lat,
            updateData.lng
          );
          const requiresExtraFee = computedDistance > MAX_FREE_DISTANCE_KM;

          if (requiresExtraFee) {
            const hasScheduledDate = updateData.scheduledDate && updateData.scheduledDate.length > 0;
            const hasScheduledTimeSlot = updateData.scheduledTimeSlot && updateData.scheduledTimeSlot.length > 0;
            
            if (!hasScheduledDate || !hasScheduledTimeSlot) {
              return res.status(400).json({ 
                message: "Fallback locations beyond 3km require scheduled delivery date and time slot." 
              });
            }
            if (updateData.extraFeeAcknowledged !== true) {
              return res.status(400).json({ 
                message: "Please acknowledge the extra delivery fee for locations beyond 3km." 
              });
            }
          }

          (updateData as any).distanceKm = computedDistance;
          (updateData as any).requiresExtraFee = requiresExtraFee;
        }
      }

      const updated = await storage.updateFallbackContact(contactId, updateData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation Error", errors: error.errors });
      } else {
        console.error("Update fallback contact error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.delete("/api/fallback-contact/:id", requireAuth, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      if (isNaN(contactId)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }

      const existingContact = await storage.getFallbackContactById(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Fallback contact not found" });
      }

      // Verify the user owns the address this contact belongs to
      const address = await storage.getAddressById(existingContact.addressId);
      if (!address || address.userId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteFallbackContact(contactId);
      res.json({ success: true, message: "Fallback contact deleted" });
    } catch (error) {
      console.error("Delete fallback contact error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Set default fallback contact for an address
  app.post("/api/fallback-contact/:id/set-default", requireAuth, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      if (isNaN(contactId)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }

      const existingContact = await storage.getFallbackContactById(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Fallback contact not found" });
      }

      // Verify the user owns the address this contact belongs to
      const address = await storage.getAddressById(existingContact.addressId);
      if (!address || address.userId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await storage.setDefaultFallbackContact(existingContact.addressId, contactId);
      res.json(updated);
    } catch (error) {
      console.error("Set default fallback error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // --- Company Routes ---

  // Helper to require company account
  const requireCompanyAuth = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.accountType !== "company") {
      return res.status(403).json({ message: "Company account required" });
    }
    const companyProfile = await storage.getCompanyProfileByUserId(req.session.userId);
    if (!companyProfile) {
      return res.status(404).json({ message: "Company profile not found" });
    }
    req.companyProfile = companyProfile;
    next();
  };

  // Get company address
  app.get("/api/company/address", requireCompanyAuth, async (req: any, res) => {
    try {
      const address = await storage.getCompanyAddressByProfileId(req.companyProfile.id);
      res.json(address || null);
    } catch (error) {
      console.error("Get company address error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Create or update company address
  app.put("/api/company/address", requireCompanyAuth, async (req: any, res) => {
    try {
      const addressData = companyAddressFormSchema.parse(req.body);
      
      const existingAddress = await storage.getCompanyAddressByProfileId(req.companyProfile.id);
      
      let result;
      if (existingAddress) {
        result = await storage.updateCompanyAddress(req.companyProfile.id, addressData);
      } else {
        result = await storage.createCompanyAddress({
          companyProfileId: req.companyProfile.id,
          ...addressData
        });
      }
      
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation Error", errors: error.errors });
      } else {
        console.error("Update company address error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // Get all pricing plans
  app.get("/api/pricing-plans", async (req, res) => {
    try {
      const plans = await storage.getPricingPlans();
      res.json(plans);
    } catch (error) {
      console.error("Get pricing plans error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Get company subscription
  app.get("/api/company/subscription", requireCompanyAuth, async (req: any, res) => {
    try {
      const subscription = await storage.getCompanySubscription(req.companyProfile.id);
      if (subscription) {
        const plan = await storage.getPricingPlanById(subscription.pricingPlanId);
        res.json({ subscription, plan });
      } else {
        res.json(null);
      }
    } catch (error) {
      console.error("Get company subscription error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Create or update company subscription
  app.post("/api/company/subscription", requireCompanyAuth, async (req: any, res) => {
    try {
      const subscriptionData = subscriptionFormSchema.parse(req.body);
      
      // Verify plan exists
      const plan = await storage.getPricingPlanById(subscriptionData.pricingPlanId);
      if (!plan) {
        return res.status(400).json({ message: "Invalid pricing plan" });
      }
      
      const existingSubscription = await storage.getCompanySubscription(req.companyProfile.id);
      
      let result;
      if (existingSubscription) {
        result = await storage.updateCompanySubscription(req.companyProfile.id, {
          pricingPlanId: subscriptionData.pricingPlanId,
          billingCycle: subscriptionData.billingCycle,
        });
      } else {
        result = await storage.createCompanySubscription({
          companyProfileId: req.companyProfile.id,
          pricingPlanId: subscriptionData.pricingPlanId,
          billingCycle: subscriptionData.billingCycle,
          status: "active",
        });
      }
      
      res.json({ subscription: result, plan });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation Error", errors: error.errors });
      } else {
        console.error("Update company subscription error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // Get company profile with address and subscription
  app.get("/api/company/profile", requireCompanyAuth, async (req: any, res) => {
    try {
      const address = await storage.getCompanyAddressByProfileId(req.companyProfile.id);
      const subscriptionData = await storage.getCompanySubscription(req.companyProfile.id);
      let subscription = null;
      let plan = null;
      
      if (subscriptionData) {
        plan = await storage.getPricingPlanById(subscriptionData.pricingPlanId);
        subscription = subscriptionData;
      }
      
      res.json({
        profile: req.companyProfile,
        address,
        subscription,
        plan
      });
    } catch (error) {
      console.error("Get company profile error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // --- Company Driver Routes ---

  // Get all company drivers
  app.get("/api/company/drivers", requireCompanyAuth, async (req: any, res) => {
    try {
      const drivers = await storage.getCompanyDrivers(req.companyProfile.id);
      res.json(drivers);
    } catch (error) {
      console.error("Get company drivers error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Add a new driver
  app.post("/api/company/drivers", requireCompanyAuth, async (req: any, res) => {
    try {
      const driverData = driverFormSchema.parse(req.body);
      
      // Check if driver ID already exists for this company
      const existingDriver = await storage.getCompanyDriverByDriverId(req.companyProfile.id, driverData.driverId);
      if (existingDriver) {
        return res.status(400).json({ message: "A driver with this ID already exists" });
      }
      
      const driver = await storage.createCompanyDriver({
        companyProfileId: req.companyProfile.id,
        driverId: driverData.driverId,
        name: driverData.name,
        phone: driverData.phone || null,
        status: driverData.status || "active",
      });
      
      res.json(driver);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation Error", errors: error.errors });
      } else {
        console.error("Create company driver error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // Bulk add drivers
  app.post("/api/company/drivers/bulk", requireCompanyAuth, async (req: any, res) => {
    try {
      const { drivers } = bulkDriverSchema.parse(req.body);
      
      const results = {
        success: [] as any[],
        failed: [] as { driverId: string; name: string; reason: string }[],
      };
      
      for (const driverData of drivers) {
        try {
          // Check if driver ID already exists for this company
          const existingDriver = await storage.getCompanyDriverByDriverId(req.companyProfile.id, driverData.driverId);
          if (existingDriver) {
            results.failed.push({
              driverId: driverData.driverId,
              name: driverData.name,
              reason: "Driver ID already exists",
            });
            continue;
          }
          
          const driver = await storage.createCompanyDriver({
            companyProfileId: req.companyProfile.id,
            driverId: driverData.driverId,
            name: driverData.name,
            phone: driverData.phone || null,
            status: "active",
          });
          
          results.success.push(driver);
        } catch (err) {
          results.failed.push({
            driverId: driverData.driverId,
            name: driverData.name,
            reason: "Failed to create driver",
          });
        }
      }
      
      res.json({
        message: `Added ${results.success.length} driver(s), ${results.failed.length} failed`,
        ...results,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation Error", errors: error.errors });
      } else {
        console.error("Bulk create company drivers error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // Update a driver
  app.put("/api/company/drivers/:id", requireCompanyAuth, async (req: any, res) => {
    try {
      const driverId = parseInt(req.params.id);
      if (isNaN(driverId)) {
        return res.status(400).json({ message: "Invalid driver ID" });
      }
      
      // Verify driver belongs to this company
      const existingDriver = await storage.getCompanyDriverById(driverId);
      if (!existingDriver || existingDriver.companyProfileId !== req.companyProfile.id) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      const driverData = driverFormSchema.partial().parse(req.body);
      
      // If changing driverId, check for duplicates
      if (driverData.driverId && driverData.driverId !== existingDriver.driverId) {
        const duplicate = await storage.getCompanyDriverByDriverId(req.companyProfile.id, driverData.driverId);
        if (duplicate) {
          return res.status(400).json({ message: "A driver with this ID already exists" });
        }
      }
      
      const updated = await storage.updateCompanyDriver(driverId, driverData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation Error", errors: error.errors });
      } else {
        console.error("Update company driver error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // Delete a driver
  app.delete("/api/company/drivers/:id", requireCompanyAuth, async (req: any, res) => {
    try {
      const driverId = parseInt(req.params.id);
      if (isNaN(driverId)) {
        return res.status(400).json({ message: "Invalid driver ID" });
      }
      
      // Verify driver belongs to this company
      const existingDriver = await storage.getCompanyDriverById(driverId);
      if (!existingDriver || existingDriver.companyProfileId !== req.companyProfile.id) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      await storage.deleteCompanyDriver(driverId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete company driver error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Validate a driver ID - used by company users to verify their own drivers
  app.get("/api/company/drivers/validate/:driverId", requireCompanyAuth, async (req: any, res) => {
    try {
      const { driverId } = req.params;
      
      const driver = await storage.getCompanyDriverByDriverId(req.companyProfile.id, driverId);
      
      if (!driver) {
        return res.json({ valid: false });
      }
      
      res.json({ 
        valid: driver.status === "active",
        driver: {
          name: driver.name,
          driverId: driver.driverId,
          status: driver.status
        }
      });
    } catch (error) {
      console.error("Validate driver error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // --- Delivery Credit Score Routes ---

  // Get overall delivery stats for the company
  app.get("/api/company/delivery-stats", requireCompanyAuth, async (req: any, res) => {
    try {
      const stats = await storage.getDeliveryStatsByCompany(req.companyProfile.companyName);
      res.json(stats);
    } catch (error) {
      console.error("Get delivery stats error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Get address-level delivery stats with credit scores for the company
  app.get("/api/company/address-delivery-stats", requireCompanyAuth, async (req: any, res) => {
    try {
      const stats = await storage.getAddressDeliveryStats(req.companyProfile.companyName);
      res.json(stats);
    } catch (error) {
      console.error("Get address delivery stats error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
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

  // --- Driver Address Lookup Routes (no auth, public for drivers) ---

  // Check if driver has pending feedback before allowing new lookup
  app.post("/api/driver/check-pending-feedback", async (req, res) => {
    try {
      const { driverId, companyName } = req.body;
      
      if (!driverId || !companyName) {
        return res.status(400).json({ message: "Driver ID and company name are required" });
      }

      // Storage layer handles normalization (case-insensitive comparison)
      const pendingLookup = await storage.getPendingFeedbackByDriver(
        String(driverId).trim(),
        String(companyName).trim()
      );
      
      if (pendingLookup) {
        // Get the address for context
        const address = await storage.getAddressById(pendingLookup.addressId);
        return res.json({
          hasPendingFeedback: true,
          pendingLookup: {
            id: pendingLookup.id,
            shipmentNumber: pendingLookup.shipmentNumber,
            addressLabel: address?.label || "Previous delivery"
          }
        });
      }
      
      res.json({ hasPendingFeedback: false });
    } catch (error) {
      console.error("Check pending feedback error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Driver address lookup - requires no pending feedback
  app.post("/api/driver/lookup-address", async (req, res) => {
    try {
      const lookupData = shipmentLookupFormSchema.parse(req.body);
      
      // Normalize inputs for consistent storage and comparison
      const normalizedDriverId = String(lookupData.driverId).trim();
      const normalizedCompanyName = String(lookupData.companyName).trim();
      
      // Check for pending feedback first (case-insensitive comparison in storage)
      const pendingLookup = await storage.getPendingFeedbackByDriver(normalizedDriverId, normalizedCompanyName);
      
      if (pendingLookup) {
        return res.status(403).json({
          message: "You must provide feedback for your previous delivery before looking up a new address",
          pendingLookupId: pendingLookup.id,
          requiresFeedback: true
        });
      }

      // Find the address by digital ID
      const address = await storage.getAddressByDigitalId(lookupData.digitalId.toUpperCase().trim());
      
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }

      // Get user info
      const user = await storage.getUser(address.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get fallback contacts for this address
      const fallbackContacts = await storage.getFallbackContactsByAddressId(address.id);

      // Create shipment lookup record with normalized values
      const shipmentLookup = await storage.createShipmentLookup({
        shipmentNumber: String(lookupData.shipmentNumber).trim(),
        driverId: normalizedDriverId,
        companyName: normalizedCompanyName,
        addressId: address.id,
        addressDigitalId: address.digitalId,
        status: "pending_feedback"
      });

      // Return address details with user info
      res.json({
        lookupId: shipmentLookup.id,
        address,
        user: {
          name: user.name,
          phone: user.phone,
          email: user.email
        },
        fallbackContacts
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation Error", errors: error.errors });
      } else {
        console.error("Driver lookup address error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // Get pending lookup details for feedback form
  app.get("/api/driver/pending-lookup/:id", async (req, res) => {
    try {
      const lookupId = parseInt(req.params.id);
      if (isNaN(lookupId)) {
        return res.status(400).json({ message: "Invalid lookup ID" });
      }

      const lookup = await storage.getShipmentLookupById(lookupId);
      if (!lookup) {
        return res.status(404).json({ message: "Lookup not found" });
      }

      if (lookup.status !== "pending_feedback") {
        return res.status(400).json({ message: "Feedback already provided for this delivery. You cannot submit feedback again." });
      }

      // Check if feedback already exists (extra protection)
      const existingFeedback = await storage.getDriverFeedbackByLookupId(lookupId);
      if (existingFeedback) {
        return res.status(400).json({ message: "Feedback has already been submitted for this delivery." });
      }

      const address = await storage.getAddressById(lookup.addressId);
      
      res.json({
        lookup,
        address: address ? {
          label: address.label,
          textAddress: address.textAddress
        } : null
      });
    } catch (error) {
      console.error("Get pending lookup error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Submit driver feedback
  app.post("/api/driver/feedback", async (req, res) => {
    try {
      const { lookupId, ...feedbackData } = req.body;
      
      if (!lookupId) {
        return res.status(400).json({ message: "Lookup ID is required" });
      }

      const parsedFeedback = driverFeedbackFormSchema.parse(feedbackData);

      // Verify the lookup exists and needs feedback
      const lookup = await storage.getShipmentLookupById(lookupId);
      if (!lookup) {
        return res.status(404).json({ message: "Lookup not found" });
      }

      if (lookup.status !== "pending_feedback") {
        return res.status(400).json({ message: "Feedback already provided for this delivery" });
      }

      // Check if feedback already exists
      const existingFeedback = await storage.getDriverFeedbackByLookupId(lookupId);
      if (existingFeedback) {
        return res.status(400).json({ message: "Feedback already submitted" });
      }

      // Get the address digital ID from the lookup
      const addressDigitalId = lookup.addressDigitalId || "";

      // Create feedback record with denormalized driver and address info
      const feedback = await storage.createDriverFeedback({
        shipmentLookupId: lookupId,
        driverId: lookup.driverId,
        companyName: lookup.companyName,
        addressDigitalId: addressDigitalId,
        deliveryStatus: parsedFeedback.deliveryStatus,
        locationScore: parsedFeedback.locationScore,
        customerBehavior: parsedFeedback.customerBehavior,
        additionalNotes: parsedFeedback.additionalNotes || null
      });

      // Update lookup status and delivery status
      await storage.updateShipmentLookupStatus(lookupId, "feedback_completed");
      await storage.updateShipmentLookupDeliveryStatus(lookupId, parsedFeedback.deliveryStatus);

      // Create delivery outcome record (especially important for failures)
      await storage.createDeliveryOutcome({
        shipmentLookupId: lookupId,
        driverId: lookup.driverId,
        companyName: lookup.companyName,
        addressDigitalId: addressDigitalId,
        deliveryStatus: parsedFeedback.deliveryStatus,
        failureReason: parsedFeedback.failureReason || null,
        failureDetails: parsedFeedback.additionalNotes || null,
        attemptCount: 1
      });

      res.json({
        success: true,
        feedback
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation Error", errors: error.errors });
      } else {
        console.error("Submit driver feedback error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
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
