import { CogniteClient, ExternalEvent } from '@cognite/sdk';
import { Relationship, postWithCursor } from '../modules/relationships';

export type PnIDAnnotationType =
  | 'Model Generated'
  | 'User Defined'
  | 'User Confirmed'
  | 'Model Recommended';

export interface PnIDAnnotation {
  id: number;
  fileId: number;
  label: string;
  type: PnIDAnnotationType;
  assetId?: number;
  version: 1;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PendingPnIDAnnotation extends Omit<PnIDAnnotation, 'id'> {}

export class PnIDApi {
  sdk: CogniteClient;

  constructor(sdk: CogniteClient) {
    this.sdk = sdk;
  }

  public createAnnotations = async (
    pendingAnnotations: PendingPnIDAnnotation[]
  ) => {
    const annotations = await this.annotationsToEvents(pendingAnnotations);
    await this.annotationsToRelationships(annotations);
    return annotations;
  };

  public fetchAnnotations = async (
    fileId: number
  ): Promise<PnIDAnnotation[]> => {
    const {
      items: relationships,
    }: { items: Relationship[] } = await postWithCursor(
      `/api/playground/projects/${this.sdk.project}/relationships/list`,
      {
        filter: {
          dataSet: `${fileId}-interactive-pnid`,
        },
        limit: 1000,
      }
    );

    const eventIds: number[] = relationships.reduce((prev, el) => {
      if (el.source.resource === 'event') {
        prev.push(Number(el.source.resourceId));
      }
      return prev;
    }, [] as number[]);

    const eventAssetMap: { [key: number]: number } = relationships.reduce(
      (prev, el) => {
        if (el.source.resource === 'asset' && el.target.resource === 'event') {
          // eslint-disable-next-line no-param-reassign
          prev[Number(el.target.resourceId)] = Number(el.source.resourceId);
        }
        return prev;
      },
      {} as { [key: number]: number }
    );

    const events = await this.sdk.events.retrieve(eventIds.map(id => ({ id })));

    return events.map(event => ({
      id: event.id,
      type: event.subtype,
      label: event.description,
      assetId: eventAssetMap[event.id],
      boundingBox: JSON.parse(event.metadata!.bounding_box!),
      version: Number(event.metadata!.version),
    })) as PnIDAnnotation[];
  };

  private annotationsToEvents = async (
    annotations: PendingPnIDAnnotation[]
  ): Promise<PnIDAnnotation[]> => {
    const pendingEvents: ExternalEvent[] = annotations.map(el => ({
      type: 'Cognite-P&ID-Contextualization',
      subtype: el.type,
      description: el.label,
      metadata: {
        bounding_box: JSON.stringify(el.boundingBox),
        version: `${el.version}`,
      },
      source: 'Discovery',
    }));

    // TODO fix for 1000 +
    const events = await this.sdk.events.create(pendingEvents);

    return annotations.map((el, i) => ({
      ...el,
      id: events[i].id,
    }));
  };

  private annotationsToRelationships = async (
    annotations: PnIDAnnotation[]
  ) => {
    const pendingRelationships: Relationship[] = annotations.reduce(
      (prev, el) => {
        prev.push({
          source: {
            resource: 'event',
            resourceId: `${el.id}`,
          },
          target: {
            resource: 'file',
            resourceId: `${el.fileId}`,
          },
          confidence: 1,
          dataSet: `${el.fileId}-interactive-pnid`,
          externalId: `pnid-event-${el.id}-file-${el.fileId}`,
          relationshipType: 'belongsTo',
        });
        if (el.assetId) {
          prev.push({
            source: {
              resource: 'asset',
              resourceId: `${el.assetId}`,
            },
            target: {
              resource: 'event',
              resourceId: `${el.id}`,
            },
            confidence: 1,
            dataSet: `${el.fileId}-interactive-pnid`,
            externalId: `pnid-asset-${el.assetId}-event-${el.id}`,
            relationshipType: 'belongsTo',
          });
        }
        return prev;
      },
      [] as Relationship[]
    );

    // TODO fix for 1000 +
    await this.sdk.post(
      `/api/playground/projects/${this.sdk.project}/relationships`,
      {
        data: {
          items: pendingRelationships,
        },
      }
    );
    return true;
  };
}
