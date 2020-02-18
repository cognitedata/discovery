import { Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { message } from 'antd';
import { Asset } from '@cognite/sdk';
import { sdk } from 'utils/SDK';
import { arrayToObjectById } from '../utils/utils';
import { canReadRelationships } from '../utils/PermissionsUtils';

// Constants
export const GET_RELATIONSHIPS = 'relationships/GET_RELATIONSHIPS';

export interface RelationshipResource {
  resource:
    | 'timeSeries'
    | 'threeD'
    | 'threeDRevision'
    | 'asset'
    | 'event'
    | 'file';
  resourceId: string;
}

export type RelationshipType =
  | 'flowsTo'
  | 'belongsTo'
  | 'isParentOf'
  | 'implements';
export interface Relationship {
  source: RelationshipResource;
  target: RelationshipResource;
  confidence: number;
  dataSet: string;
  externalId: string;
  relationshipType: RelationshipType;
}

interface FetchRelationshipsAction extends Action<typeof GET_RELATIONSHIPS> {
  payload: { items: Relationship[]; assetId: string };
}

type RelationshipActions = FetchRelationshipsAction;

// Reducer
export interface RelationshipState {
  items: { [key: string]: Relationship };
  byAssetId: { [key: string]: string[] };
}

const initialState: RelationshipState = {
  items: {},
  byAssetId: {},
};

export default function reducer(
  state = initialState,
  action: RelationshipActions
): RelationshipState {
  switch (action.type) {
    case GET_RELATIONSHIPS: {
      const { items, assetId } = action.payload;
      return {
        ...state,
        items: {
          ...state.items,
          ...arrayToObjectById(items.map(el => ({ ...el, id: el.externalId }))),
        },
        byAssetId: {
          ...state.byAssetId,
          [assetId]: items.map(el => el.externalId),
        },
      };
    }

    default:
      return state;
  }
}

// Functions

export async function postWithCursor(url: string, data: any) {
  const result = await sdk.post(url, {
    data,
  });
  if (result.status !== 200) {
    throw new Error('Could not fetch relationships.');
  }

  let { items } = result.data;
  if (result.data.nextCursor) {
    const newData = await postWithCursor(url, {
      ...data,
      cursor: result.data.nextCursor,
    });
    items = items.concat(newData.items);
  }

  return { items };
}

export function fetchRelationshipsForAssetId(asset: Asset) {
  return async (
    dispatch: ThunkDispatch<any, void, FetchRelationshipsAction>
  ) => {
    if (!canReadRelationships()) {
      return;
    }

    try {
      const { project } = sdk;
      const limit = 1000;

      const [
        resultFrom,
        resultTo,
        resultFromExt,
        resultToExt,
      ] = await Promise.all([
        postWithCursor(
          `/api/playground/projects/${project}/relationships/list`,
          {
            filter: {
              sourceResource: 'asset',
              sourceResourceId: `${asset.id}`,
            },
            limit,
          }
        ),
        postWithCursor(
          `/api/playground/projects/${project}/relationships/list`,
          {
            filter: {
              targetResource: 'asset',
              targetResourceId: `${asset.id}`,
            },
            limit,
          }
        ),
        ...(asset.externalId
          ? [
              postWithCursor(
                `/api/playground/projects/${project}/relationships/list`,
                {
                  filter: {
                    sourceResource: 'asset',
                    sourceResourceId: `${asset.externalId}`,
                  },
                  limit,
                }
              ),
              postWithCursor(
                `/api/playground/projects/${project}/relationships/list`,
                {
                  filter: {
                    targetResource: 'asset',
                    targetResourceId: `${asset.externalId}`,
                  },
                  limit,
                }
              ),
            ]
          : []),
      ]);

      let items = resultFrom.items.concat(resultTo.items);
      if (asset.externalId) {
        items = items.concat(resultFromExt.items).concat(resultToExt.items);
      }
      dispatch({
        type: GET_RELATIONSHIPS,
        payload: { items, assetId: `${asset.id}` },
      });
    } catch (ex) {
      message.error('Unable to retrieve relationship data');
    }
  };
}

// Selectors
