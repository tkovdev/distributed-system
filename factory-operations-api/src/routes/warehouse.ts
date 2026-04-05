import express, { Request, Response } from 'express';
import { IMaterial, MaterialModel, MaterialType } from '../models/material';
import { PartModel } from '../models/part';

const router = express.Router();

// Function to get all materials in the warehouse
const getMaterialWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const materials = await MaterialModel.find({});

    res.status(200).json({
      materials
    });
  } catch (error) {
    console.error('Error fetching materials from warehouse:', error);
    res.status(500).json({ 
      error: 'Failed to fetch materials from warehouse',
      message: 'An internal server error occurred'
    });
  }
};

const getPartWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const parts = await PartModel.find({});

    res.status(200).json({
      parts
    });
  } catch (error) {
    console.error('Error fetching parts from warehouse:', error);
    res.status(500).json({ 
      error: 'Failed to fetch parts from warehouse',
      message: 'An internal server error occurred'
    });
  }
};

const seedMaterialsData = async (req: Request, res: Response): Promise<void> => {
  try {
    
    // Clear existing data
    await MaterialModel.deleteMany({});

    const materials: IMaterial[] = [
      { name: 'Sheet', type: MaterialType.steel, lotNumber: '2026-S-001', quantity: 100 },
      { name: 'Sheet', type: MaterialType.aluminum, lotNumber: '2026-A-001', quantity: 100 },
      { name: 'Bolt', type: MaterialType.aluminum, lotNumber: '2026-A-002', quantity: 300 },
    ];
    
    await MaterialModel.insertMany(materials);

    res.status(201).json({
      message: 'Database seeded successfully',
      count: materials.length
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ 
      error: 'Failed to seed database',
      message: 'An internal server error occurred'
    });
  }
};

// Register routes
router.get('/parts', getPartWarehouse);
router.get('/materials', getMaterialWarehouse);
router.post('/materials/seed', seedMaterialsData);

export default router;