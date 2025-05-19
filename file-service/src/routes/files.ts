import express, { Request, Response } from 'express';

const router = express.Router();

// Function to get files
const getFiles = (req: Request, res: Response): void => {
  res.status(200).json({
    files: [
      { id: 1, name: 'File name 1', date: new Date().toISOString() },
      { id: 2, name: 'File name 2', date: new Date().toISOString() }
    ]
  });
};

// Register routes
router.get('/', getFiles);

export default router;