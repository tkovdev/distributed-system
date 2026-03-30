import express, { Request, Response } from 'express';
import axios from 'axios';
import { jsPDF } from 'jspdf';

const router = express.Router();
const FILE_SERVICE_URL = process.env.FILE_SERVICE_URL || 'http://localhost:3100';
const DATA_SERVICE_URL = process.env.DATA_SERVICE_URL || 'http://localhost:3300';

// Function to get reports from data-service
const getReport = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the id from the request parameters
    const { id } = req.params;

    // Call the data-service to get servers
    const response = await axios.get(`${DATA_SERVICE_URL}/servers`);

    // Find the server with the matching id
    const server = response.data.servers.find((server: any) => server.id === parseInt(id));

    if (!server) {
      res.status(404).json({
        error: 'Server not found',
        message: `No server found with id ${id}`
      });
      return;
    }

    console.info(`Generating report for server: ${server.name} (ID: ${server.id})`);

    // Create a PDF using jsPDF
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text(`Server Report - ${server.name}`, 20, 20);

    // Add server details
    doc.setFontSize(12);
    doc.text(`ID: ${server.id}`, 20, 40);
    doc.text(`Name: ${server.name}`, 20, 50);
    doc.text(`Date: ${new Date(server.date).toLocaleString()}`, 20, 60);
    doc.text(`Status: ${server.status || 'N/A'}`, 20, 70);
    doc.text(`IP Address: ${server.ipAddress || 'N/A'}`, 20, 80);
    doc.text(`Location: ${server.location || 'N/A'}`, 20, 90);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=server-report-${server.id}.pdf`);

    // Send the PDF as the response
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Error fetching server from data-service:', error);
    res.status(500).json({ 
      error: 'Failed to fetch server from data-service',
      message: 'The data service might be down or unreachable'
    });
  }
};

// Register routes
router.get('/:id', getReport);

export default router;
