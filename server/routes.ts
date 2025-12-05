import type { Express } from "express";
import { type Server } from "http";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { insertUserSchema, insertAddressSchema, insertFallbackContactSchema } from "@shared/schema";
import { calculateDistanceKm } from "@shared/utils";
import { z } from "zod";

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

      // 2. Check Duplicates
      const existingIqama = await storage.getUserByIqama(userData.iqamaId);
      if (existingIqama) return res.status(400).json({ message: "ID already registered" });

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

  app.post("/api/login", async (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ message: "Missing credentials" });

    // Find user by Email OR ID
    let user = await storage.getUserByEmail(identifier);
    if (!user) user = await storage.getUserByIqama(identifier);
    
    // Verify password using bcrypt
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Login
    req.session.userId = user.id;
    res.json({ user });
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
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
