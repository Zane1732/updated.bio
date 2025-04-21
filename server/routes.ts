import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint for request statistics - get RPS (requests per second)
  app.get('/api/rps', async (req, res) => {
    // Generate a random count between 1 and 20
    const count = Math.floor(Math.random() * 20) + 1;
    
    // Save to database
    try {
      await storage.saveRequestStat({ count });
    } catch (err) {
      console.error('Failed to save request stat:', err);
    }
    
    // Return the count value
    res.json({ c: count });
  });
  
  // API endpoint to get historical request stats
  app.get('/api/stats', async (req, res) => {
    try {
      // Get the 30 most recent stats entries
      const stats = await storage.getRecentRequestStats(30);
      res.json({ stats });
    } catch (err) {
      console.error('Failed to retrieve stats:', err);
      res.status(500).json({ error: 'Failed to retrieve stats' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
