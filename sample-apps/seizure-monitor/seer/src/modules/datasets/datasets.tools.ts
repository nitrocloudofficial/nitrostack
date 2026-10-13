import { ExecutionContext, Injectable, ToolDecorator as Tool, Widget, z } from '@nitrostack/core';
import { mlServiceProfileSchema } from '../ml-client/ml-client.schemas.js';
import { MlClientService, MlServiceError } from '../ml-client/ml-client.service.js';
import { approvedDatasetIds } from './datasets.types.js';
import { DatasetsService } from './datasets.service.js';

export const profileDatasetInputSchema = z.object({
  datasetId: z.enum(approvedDatasetIds).describe('An approved dataset ID from seer://datasets.'),
}).strict();

@Injectable({ deps: [DatasetsService, MlClientService] })
export class DatasetsTools {
  constructor(
    private readonly datasets: DatasetsService,
    private readonly mlClient: MlClientService,
  ) {}

  @Tool({
    name: 'profile_dataset',
    description: 'Profile an approved Seer CSV dataset before choosing a target or creating an analysis plan.',
    inputSchema: profileDatasetInputSchema,
    outputSchema: mlServiceProfileSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  })
  @Widget('dataset-profile')
  async profileDataset(input: z.infer<typeof profileDatasetInputSchema>, context: ExecutionContext) {
    try {
      const csv = await this.datasets.readCsv(input.datasetId);
      const profile = await this.mlClient.profile(input.datasetId, csv, context.requestId);
      context.logger.info('Dataset profiled', {
        datasetId: input.datasetId,
        rows: profile.dimensions.rows,
        columns: profile.dimensions.columns,
        requestId: context.requestId,
      });
      return profile;
    } catch (error) {
      const code = error instanceof MlServiceError ? error.code : 'dataset_error';
      context.logger.error('Dataset profiling failed', { datasetId: input.datasetId, code, requestId: context.requestId });
      throw error;
    }
  }
}
