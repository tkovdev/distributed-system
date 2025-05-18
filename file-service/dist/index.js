"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3100;
// Middleware for parsing JSON
app.use(express_1.default.json());
// Simple health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'report-service' });
});
// Example report endpoint
app.get('/files', (req, res) => {
    res.status(200).json({
        files: [
            { id: 1, name: 'File name 1', date: new Date().toISOString() },
            { id: 2, name: 'File name 2', date: new Date().toISOString() }
        ]
    });
});
// Start the server
app.listen(PORT, () => {
    console.log(`File service running on port ${PORT}`);
});
exports.default = app;
