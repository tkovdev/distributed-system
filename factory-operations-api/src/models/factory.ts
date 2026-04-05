import mongoose, { Schema, Types } from 'mongoose';
import { IConveyor } from './conveyor';

// Interface for Factory document
export interface IFactory {
  name: string;
  status?: string;
  location?: string;
  conveyors?: (IConveyor | Types.ObjectId)[]; // Optional array of conveyors associated with the factory
}

// Schema for Factory
const FactorySchema: Schema = new Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
  location: { type: String },
  conveyors: [{ type: Schema.Types.ObjectId, ref: 'Conveyor' }], // Reference to Conveyor documents
});

// Create and export the Factory model
export const FactoryModel = mongoose.model<IFactory>('Factory', FactorySchema);