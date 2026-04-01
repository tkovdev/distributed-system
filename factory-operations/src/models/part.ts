import mongoose, { Schema } from 'mongoose';

// Interface for Conveyor document
export interface IPart {
  name: string;
  type: PartType;
}

export interface DoDadPart extends IPart {
  type: PartType.dodad;
  size: string;
}

export interface WidgetPart extends IPart {
  type: PartType.widget;
  weight: number;
}

export enum PartType {
  dodad = 'DoDad',
  widget = 'Widget'
}

// Schema for Part
const PartSchema: Schema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: Object.values(PartType), required: true },
},  
{
  discriminatorKey: 'type',
  collection: 'parts',
}
);

// Create and export the Part model
export const PartModel = mongoose.model<IPart>('Parts', PartSchema);

export const DoDadPartModel = PartModel.discriminator<DoDadPart>(
  PartType.dodad,
  new Schema({
    size: { type: String }, // DoDad-specific
  })
);

export const WidgetPartModel = PartModel.discriminator<WidgetPart>(
  PartType.widget,
  new Schema({
    weight: { type: Number }, // Widget-specific
  })
);