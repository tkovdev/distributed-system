import mongoose, { Schema } from 'mongoose';

// Interface for Conveyor document
export interface IConveyor {
  name: string;
  status?: string;
}

// Schema for Conveyor
const ConveyorSchema: Schema = new Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
});

// Create and export the Conveyor model
export const ConveyorModel = mongoose.model<IConveyor>('Conveyor', ConveyorSchema);