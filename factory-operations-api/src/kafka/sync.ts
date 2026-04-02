import { FactoryModel } from '../models/factory';
import { publishCommand } from './producer';

interface ConveyorAggregate {
  _id: string;
  name: string;
  status: string;
  capacity: number;
}

interface FactoryAggregate {
  _id: string;
  name: string;
  location: string;
  totalCapacity: number;
  conveyors: ConveyorAggregate[];
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
        conveyors: {
          $map: {
            input: '$conveyorDocs',
            as: 'c',
            in: {
              conveyorId: { $toString: '$$c._id' },
              name: '$$c.name',
              status: '$$c.status',
              capacity: '$$c.capacity',
            },
          },
        },
      },
    },
  ]);

  for (const factory of factories) {
    await publishCommand('REGISTER_FACTORY', factory._id.toString(), {
      name: factory.name,
      location: factory.location ?? '',
      totalCapacity: factory.totalCapacity,
      conveyors: factory.conveyors,
    });
  }

  console.log(`Synced ${factories.length} factory/factories to orchestrator`);
};
