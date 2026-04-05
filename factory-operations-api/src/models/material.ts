import mongoose, { Schema } from 'mongoose';

// Interface for Material document
export interface IMaterial {
  name: string;
  type: MaterialType;
  lotNumber: string;
  quantity: number;
}

export enum MaterialType {
    steel = 'Steel',
    aluminum = 'Aluminum',
    plastic = 'Plastic'
}

// Schema for Material
const MaterialSchema: Schema = new Schema({
    name: { type: String, required: true },
    type: { type: String, enum: Object.values(MaterialType), required: true },
    lotNumber: { type: String, required: true },
    quantity: { type: Number, required: true },
});

// Create and export the Material model
export const MaterialModel = mongoose.model<IMaterial>('Material', MaterialSchema);