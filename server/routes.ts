import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertAddressSchema } from "@shared/schema";
import { z } from "zod";

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

      // 3. Create User
      const newUser = await storage.createUser(userData);

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
    
    // Verify
    if (!user || user.password !== password) {
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
      const addressData = insertAddressSchema.parse({
        ...req.body,
        userId: req.session.userId,
        digitalId: generateDigitalId()
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

  app.patch("/api/addresses/:id", requireAuth, async (req, res) => {
    const addressId = parseInt(req.params.id);
    const updates = req.body;
    
    const updated = await storage.updateAddress(addressId, updates);
    if (!updated) return res.status(404).json({ message: "Address not found" });
    
    res.json(updated);
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
