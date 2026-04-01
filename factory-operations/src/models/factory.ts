import mongoose, { Document, Schema } from 'mongoose';

// Interface for Factory document
export interface IFactory extends Document {
  id: number;
  name: string;
  status?: string;
  location?: string;
}

// Schema for Factory
const FactorySchema: Schema = new Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
  location: { type: String }
}, {
  timestamps: true
});

// Create and export the Factory model
export const FactoryModel = mongoose.model<IFactory>('Factory', FactorySchema);