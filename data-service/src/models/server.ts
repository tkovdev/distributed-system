import mongoose, { Document, Schema } from 'mongoose';

// Interface for Server document
export interface IServer extends Document {
  id: number;
  name: string;
  date: Date;
  status?: string;
  ipAddress?: string;
  location?: string;
}

// Schema for Server
const ServerSchema: Schema = new Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
  ipAddress: { type: String },
  location: { type: String }
}, {
  timestamps: true
});

// Create and export the Server model
export default mongoose.model<IServer>('Server', ServerSchema);