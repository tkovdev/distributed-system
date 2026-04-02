import { FactoryModel } from '../models/factory';
import { publishCommand } from './producer';

interface FactoryAggregate {
  _id: string;
  name: string;
  location: string;
  totalCapacity: number;
}

/**
 * Queries all factories from MongoDB and publishes a REGISTER_FACTORY command
 * for each one so the orchestrator has up-to-date initial state.
 */
export const syncFactoriesToOrchestrator = async (): Promise<void> => {
  const factories: FactoryAggregate[] = await FactoryModel.aggregate([
    {
      $lookup: {
        from: 'conveyors',
        localField: 'conveyors',
        foreignField: '_id',
        as: 'conveyorDocs',
      },
    },
    {
      $project: {
        name: 1,
        location: 1,
        totalCapacity: { $sum: '$conveyorDocs.capacity' },
      },
    },
  ]);

  for (const factory of factories) {
    await publishCommand('REGISTER_FACTORY', factory._id.toString(), {
      name: factory.name,
      location: factory.location ?? '',
      totalCapacity: factory.totalCapacity,
    });
  }

  console.log(`Synced ${factories.length} factory/factories to orchestrator`);
};
