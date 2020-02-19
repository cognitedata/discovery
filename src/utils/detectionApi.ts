/* eslint-disable max-classes-per-file */

import {
  CogniteClient,
  EventSearch,
  EventPatch,
  DateRange,
  CogniteInternalId,
  IdEither,
  Limit,
  SinglePatchString,
  SinglePatchDate,
  ObjectPatch,
  ArrayPatchLong,
  Metadata,
  RemoveField,
  SetField,
  Timestamp,
  CogniteExternalId,
  InternalId,
  ExternalId,
  EventChange,
  ExternalEvent,
  CogniteEvent,
  EventFilterRequest,
  ListResponse,
  FilterQuery,
  EventFilter,
} from '@cognite/sdk';

export enum ManualVerificationState {
  UNHANDLED = 'unhandled',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export type SinglePatchManualVerificationState =
  | SetField<ManualVerificationState>
  | RemoveField;

export interface BoundingBox2D {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type SinglePatchBoundingBox2D = SetField<BoundingBox2D> | RemoveField;

export interface ExternalDetection {
  externalId?: CogniteExternalId;
  startTime?: Timestamp;
  endTime?: Timestamp;
  label?: string;
  description?: string;
  metadata?: Metadata;
  assetIds?: CogniteInternalId[];
  box?: BoundingBox2D;
  fileExternalId?: string;
  manuallyVerified?: ManualVerificationState;
}
export interface CogniteDetection extends ExternalDetection, InternalId {
  lastUpdatedTime: Date;
  createdTime: Date;
}

export interface DetectionFilter {
  startTime?: DateRange;
  endTime?: DateRange;
  createdTime?: DateRange;
  lastUpdatedTime?: DateRange;
  metadata?: Metadata;
  /**
   * Asset IDs of related equipment that this event relates to.
   */
  assetIds?: CogniteInternalId[];
  /**
   * The IDs of the root assets that the related assets should be children of.
   */
  rootAssetIds?: IdEither[];
  /**
   * Filter by label
   */
  label?: string;
  /**
   * Filter detections with an externalId starting with this value
   */
  externalIdPrefix?: string;
  /**
   * Filter based on file id
   */
  fileExternalId?: string;
}

export interface DetectionFilterRequest extends FilterQuery {
  filter: DetectionFilter;
}

export interface DetectionPatch {
  update: {
    externalId?: SinglePatchString;
    startTime?: SinglePatchDate;
    endTime?: SinglePatchDate;
    description?: SinglePatchString;
    metadata?: ObjectPatch;
    assetIds?: ArrayPatchLong;
    label?: SinglePatchString;
    box?: SinglePatchBoundingBox2D;
    fileExternalId?: SinglePatchString;
    manualVerificationState?: SinglePatchManualVerificationState;
  };
}

export interface DetectionChangeById extends DetectionPatch, InternalId {}

export interface DetectionChangeByExternalId
  extends DetectionPatch,
    ExternalId {}

export type DetectionChange = DetectionChangeById | DetectionChangeByExternalId;

export interface DetectionSearchRequest extends Limit {
  filter?: DetectionFilter;
  search?: EventSearch;
}

export class DetectionsAPI {
  sdk: CogniteClient;

  mapper: DetectionMapper;

  constructor(sdk: CogniteClient) {
    this.sdk = sdk;
    this.mapper = new DetectionMapper(sdk);
  }

  public create = async (
    items: ExternalDetection[]
  ): Promise<CogniteDetection[]> => {
    return this.sdk.events
      .create(this.mapper.mapDetectionsToEvents(items))
      .then(this.mapper.mapEventsToDetections);
  };

  public list = (
    scope?: DetectionFilterRequest
  ): Promise<ListResponse<CogniteDetection[]>> => {
    const eventScope: EventFilterRequest = {
      ...scope,
      filter: scope && this.mapper.mapFilter(scope.filter),
    };
    const eventPromise = this.sdk.events.list(eventScope);
    const detectionPromise = eventPromise.then(this.mapper.mapListResponse);
    return detectionPromise;
  };

  public retrieve = async (items: IdEither[]): Promise<CogniteDetection[]> => {
    return this.sdk.events
      .retrieve(items)
      .then(this.mapper.mapEventsToDetections);
  };

  public update = (changes: DetectionChange[]) => {
    return Promise.all(changes.map(this.mapper.mapUpdateToEvent))
      .then(this.sdk.events.update)
      .then(this.mapper.mapEventsToDetections);
  };

  public search = (search: DetectionSearchRequest) => {
    return this.sdk.events
      .search({
        ...search,
        filter: search.filter && this.mapper.mapFilter(search.filter),
      })
      .then(this.mapper.mapEventsToDetections);
  };

  public delete = (ids: IdEither[]) => this.sdk.events.delete(ids);
}

interface EventPatchHack {
  update: {
    subtype?: SinglePatchString;
  };
}

interface ObjectSetPatch {
  set: {
    [key: string]: string;
  };
}

interface ObjectChangePatch {
  add: {
    [key: string]: string;
  };
  remove: string[];
}

class DetectionMapper {
  private EVENT_TYPE: string = 'cognite_detection';

  private prefix: string = 'CDF_DETECTION';

  private metadataKeys: Set<string>;

  private sdk: CogniteClient;

  constructor(sdk: CogniteClient) {
    this.sdk = sdk;
    this.metadataKeys = new Set([
      this.key('box'),
      this.key('file_external_id'),
      this.key('manually_verified'),
    ]);
  }

  key(snakeCaseField: string) {
    return `${this.prefix}_${snakeCaseField}`;
  }

  mapListResponse = (
    eventResponse: ListResponse<CogniteEvent[]>
  ): ListResponse<CogniteDetection[]> => {
    return {
      items: this.mapEventsToDetections(eventResponse.items),
      next:
        eventResponse.next &&
        (() => eventResponse.next!().then(this.mapListResponse)),
    };
  };

  mapFilter = (detectionFilter: DetectionFilter): EventFilter => {
    return {
      startTime: detectionFilter.startTime,
      endTime: detectionFilter.endTime,
      createdTime: detectionFilter.endTime,
      lastUpdatedTime: detectionFilter.lastUpdatedTime,
      metadata: {
        ...detectionFilter.metadata,
        ...(detectionFilter.fileExternalId && {
          [this.key('file_external_id')]: detectionFilter.fileExternalId,
        }),
      },
      assetIds: detectionFilter.assetIds,
      rootAssetIds: detectionFilter.rootAssetIds,
      subtype: detectionFilter.label,
      externalIdPrefix: detectionFilter.externalIdPrefix,
      type: this.EVENT_TYPE,
    };
  };

  validateMetadataInput = (metadata: Metadata) => {
    if (metadata) {
      const invalidField: string[] = [];
      this.metadataKeys.forEach(field => {
        if (field in metadata) invalidField.push(field);
      });
      if (invalidField) {
        throw new Error(
          `Reserved metadata field for detections: ${invalidField}`
        );
      }
    }
  };

  mapDetectionsToEvents = (items: ExternalDetection[]): ExternalEvent[] => {
    return items.map(this.mapDetectionToEvent);
  };

  mapDetectionToEvent = (detection: ExternalDetection): ExternalEvent => {
    if (detection.metadata) {
      this.validateMetadataInput(detection.metadata);
    }
    const metadatamapped: Metadata = {};
    if (detection.box) {
      metadatamapped[this.key('box')] = JSON.stringify(detection.box);
    }
    if (detection.fileExternalId) {
      metadatamapped[this.key('file_external_id')] = detection.fileExternalId;
    }
    if (detection.manuallyVerified) {
      metadatamapped[this.key('manually_verified')] =
        detection.manuallyVerified;
    }
    const metadata = this.metadataMergeInto(metadatamapped, detection.metadata);

    return {
      externalId: detection.externalId,
      startTime: detection.startTime,
      endTime: detection.endTime,
      type: this.EVENT_TYPE,
      subtype: detection.label,
      description: detection.description,
      metadata,
      assetIds: detection.assetIds,
    };
  };

  mapEventsToDetections = (items: CogniteEvent[]): CogniteDetection[] => {
    return items.map(this.mapEventToDetection);
  };

  mapEventToDetection = (event: CogniteEvent): CogniteDetection => {
    const detection: CogniteDetection = {
      id: event.id,
      externalId: event.externalId,
      startTime: event.startTime,
      endTime: event.endTime,
      label: event.subtype,
      description: event.description,
      assetIds: event.assetIds,
      box: event.metadata && JSON.parse(event.metadata[this.key('box')]),
      fileExternalId:
        event.metadata && event.metadata[this.key('file_external_id')],
      manuallyVerified:
        event.metadata &&
        (event.metadata[
          this.key('manually_verified')
        ] as ManualVerificationState),
      createdTime: event.createdTime,
      lastUpdatedTime: event.lastUpdatedTime,
    };
    if (event.metadata) {
      Object.keys(event.metadata).forEach(key => {
        if (!this.metadataKeys.has(key)) {
          detection.metadata = detection.metadata || {};
          detection.metadata[key] = event.metadata![key];
        }
      });
    }
    return detection;
  };

  metadataMergeInto = (a: Metadata, b?: Metadata): Metadata | undefined => {
    if (b) {
      Object.keys(b).forEach(o => {
        // eslint-disable-next-line no-param-reassign
        a[o] = b[o];
      });
    }
    if (Object.keys(a).length === 0) {
      return undefined;
    }
    return a;
  };

  mapUpdateToEvent = async (change: DetectionChange): Promise<EventChange> => {
    const internalId: number | undefined = (change as DetectionChangeById).id;
    const { externalId } = change as DetectionChangeByExternalId;

    const eventPatch: EventPatch = {
      update: {
        description: change.update.description,
        assetIds: change.update.assetIds,
        endTime: change.update.endTime,
        startTime: change.update.startTime,
        externalId: change.update.externalId,
      },
    };
    (eventPatch as EventPatchHack).update.subtype = change.update.label;
    if (change.update.metadata) {
      eventPatch.update.metadata = change.update.metadata;
    }
    const mapper = await this.getMetadataMapper(
      eventPatch.update.metadata,
      async () => {
        if (this.oldMetadataRequired(change)) {
          return (
            await this.sdk.events.retrieve([{ id: internalId, externalId }])
          )[0].metadata;
        }
        return {};
      }
    );
    eventPatch.update.metadata = mapper
      .add(this.key('box'), () =>
        this.boundingBoxPatchToStringPatch(change.update.box)
      )
      .add(this.key('file_external_id'), () => change.update.fileExternalId)
      .add(this.key('manually_verified'), () =>
        this.manualVerificationPatchToStringPatch(
          change.update.manualVerificationState
        )
      )
      .get();

    return internalId
      ? { id: internalId, ...eventPatch }
      : { externalId, ...eventPatch };
  };

  oldMetadataRequired = (detectionChange: DetectionChange) => {
    return !(
      detectionChange.update.box &&
      detectionChange.update.fileExternalId &&
      detectionChange.update.manualVerificationState
    );
  };

  manualVerificationPatchToStringPatch = (
    patch?: SinglePatchManualVerificationState
  ): undefined | SinglePatchString => {
    if (!patch || (patch as RemoveField).setNull !== undefined) {
      return patch as SinglePatchString;
    }
    return { set: (patch as SetField<ManualVerificationState>).set };
  };

  boundingBoxPatchToStringPatch = (
    patch?: SinglePatchBoundingBox2D
  ): undefined | SinglePatchString => {
    if (!patch || (patch as RemoveField).setNull !== undefined) {
      return patch as SinglePatchString;
    }
    return { set: JSON.stringify((patch as SetField<BoundingBox2D>).set) };
  };

  isSetPatch = (objectPatch: ObjectPatch): objectPatch is ObjectSetPatch => {
    return (objectPatch as any).set !== undefined;
  };

  getMetadataMapper = async (
    metadataUpdate: ObjectPatch | undefined,
    oldMetadataRetriever: () => Promise<Metadata | undefined>
  ) => {
    if (metadataUpdate && this.isSetPatch(metadataUpdate)) {
      this.validateMetadataInput(metadataUpdate.set);
      return new MetadataSetPatchMapper(
        metadataUpdate,
        await oldMetadataRetriever()
      );
    }
    return new MetadataChangePatchMapper(metadataUpdate);
  };
}

interface MetadataPatchMapper {
  add: (
    field: string,
    getter: () => undefined | SinglePatchString
  ) => MetadataPatchMapper;
  get: () => ObjectPatch | undefined;
}

function isRemoveField(field: SinglePatchString): field is RemoveField {
  return (field as RemoveField).setNull !== undefined;
}

class MetadataSetPatchMapper implements MetadataPatchMapper {
  private patch: ObjectSetPatch;

  private oldMetadata: Metadata | undefined;

  constructor(patch: ObjectSetPatch, oldMetadata: Metadata | undefined) {
    this.patch = patch;
    this.oldMetadata = oldMetadata;
  }

  add = (
    field: string,
    getter: () => undefined | SinglePatchString
  ): MetadataPatchMapper => {
    const stringPatch = getter();
    if (!stringPatch) {
      if (this.oldMetadata) {
        this.patch.set[field] = this.oldMetadata[field];
      }
    } else if (!isRemoveField(stringPatch)) {
      this.patch.set[field] = stringPatch.set;
    }
    return this;
  };

  get() {
    return this.patch;
  }
}

class MetadataChangePatchMapper implements MetadataPatchMapper {
  private patch?: ObjectChangePatch;

  constructor(patch: ObjectChangePatch | undefined) {
    this.patch = patch;
  }

  add = (
    field: string,
    getter: () => undefined | SinglePatchString
  ): MetadataPatchMapper => {
    const stringPatch = getter();
    if (stringPatch) {
      this.patch = this.patch || { remove: [], add: {} };
      if (isRemoveField(stringPatch)) {
        this.patch.remove.push(field);
      } else {
        this.patch.add[field] = stringPatch.set;
      }
    }
    return this;
  };

  get() {
    return this.patch;
  }
}
