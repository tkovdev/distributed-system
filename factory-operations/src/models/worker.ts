import mongoose, { Schema } from 'mongoose';

// Interface for Worker document
export interface IWorker {
  name: string;
  location: string;
  type: WorkerType;
}

export interface HumanWorker extends IWorker {
  type: WorkerType.human;
  shift: HumanWorkerShift;
}

export interface RobotWorker extends IWorker {
  type: WorkerType.robot;
  firmwareVersion: string;
}

export enum WorkerType {
  human = 'human',
  robot = 'robot'
}

export enum HumanWorkerShift {
  day = 'day',
  night = 'night'
}

const WorkerSchema: Schema = new Schema(
  {
  name: { type: String, required: true },
  location: { type: String },
  type: { type: String, enum: Object.values(WorkerType), required: true }
  },  
  {
    discriminatorKey: 'type',
    collection: 'workers',
  });

// Create and export the Worker model
export const WorkerModel = mongoose.model<IWorker>('Worker', WorkerSchema);

// Human discriminator
export const HumanWorkerModel = WorkerModel.discriminator<HumanWorker>(
  WorkerType.human,
  new Schema({
    shift: { type: String }, // Human-specific
  })
);

// Robot discriminator
export const RobotWorkerModel = WorkerModel.discriminator<RobotWorker>(
  WorkerType.robot,
  new Schema({
    firmwareVersion: { type: String }, // Robot-specific
  })
);