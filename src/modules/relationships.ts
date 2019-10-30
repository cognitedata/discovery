import { AnyAction, Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { message } from 'antd';
import { RootState } from '../reducers/index';
import { sdk } from '../index';

// Constants
export const GET_RELATIONSHIPS = 'relationships/GET_RELATIONSHIPS';

export interface RelationshipResource {
  resource: 'timeSeries' | 'threeD' | 'threeDRevision' | 'asset';
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
  payload: { items: Relationship[] };
}

type RelationshipActions = FetchRelationshipsAction;

// Functions
export function fetchRelationships() {
  return async (dispatch: ThunkDispatch<any, void, AnyAction>) => {
    const { project } = sdk;
    try {
      const response = await sdk.get(
        `https://api.cognitedata.com/api/playground/projects/${project}/relationships`
      );

      if (response.status === 200) {
        dispatch({
          type: GET_RELATIONSHIPS,
          payload: { items: response.data.items },
        });
      } else {
        throw new Error('Unable to fetch relationships');
      }
    } catch (ex) {
      message.error('unable to retrieve relationship data');
    }
  };
}

async function doFetchRelationshipsForAssetId(
  id: number,
  depth: number,
  maxDepth: number,
  requestCount: number = 0
) {
  const { project } = sdk;
  let relationships: any[] = []; // eslint-disable-line no-shadow
  if (requestCount > 50) {
    // Stop if we have to fetch more than 50 assets
    return { relationships, requestCount };
  }

  const [resultFrom, resultTo] = await Promise.all([
    sdk.post(
      `https://api.cognitedata.com/api/playground/projects/${project}/relationships/list`,
      {
        data: {
          filter: {
            sourceResource: 'asset',
            sourceResourceId: `${id}`,
          },
        },
      }
    ),
    sdk.post(
      `https://api.cognitedata.com/api/playground/projects/${project}/relationships/list`,
      {
        data: {
          filter: {
            targetResource: 'asset',
            targetResourceId: `${id}`,
          },
        },
      }
    ),
  ]);

  if (resultFrom.status !== 200 || resultTo.status !== 200) {
    throw new Error('Unable to fetch relationships for given asset');
  }

  relationships = resultFrom.data.items.concat(resultTo.data.items);

  let newRequestCount = requestCount;
  if (depth < maxDepth) {
    const ids: number[] = relationships.map(
      (relationship: any) => relationship.source.resourceId
    );
    const uniqueIds: number[] = Array.from(new Set(ids));

    let newRelationships = await Promise.all(
      uniqueIds.map(assetId =>
        doFetchRelationshipsForAssetId(
          assetId,
          depth + 1,
          maxDepth,
          requestCount
        )
      )
    );

    // newRelationships is now an array of arrays (each result from the ids above). Merge into one array
    newRelationships = newRelationships.reduce((prev: any, current: any) => {
      // For each asset id we fetched relationships, add those to the list and count the number of requests
      current.forEach((data: { relationships: any; requestCount: number }) => {
        prev.push(data.relationships);
        newRequestCount += data.requestCount;
      });
      return prev;
    }, []);

    relationships = Array.from(
      new Set([...relationships, ...newRelationships])
    );
  }

  return { relationships, requestCount: newRequestCount };
}

export function fetchRelationshipsForAssetId(
  id: number,
  depth: number = 0,
  maxDepth: number = 1
) {
  return async (dispatch: ThunkDispatch<any, void, AnyAction>) => {
    try {
      const {
        relationships: relationships_,
      } = await doFetchRelationshipsForAssetId(id, depth, maxDepth);

      dispatch({
        type: GET_RELATIONSHIPS,
        payload: { items: relationships_ },
      });
    } catch (ex) {
      message.error('unable to retrieve relationship data');
    }
  };
}

// Reducer
export interface RelationshipState {
  items: Relationship[];
}
const initialState: RelationshipState = {
  items: [],
};

export default function relationships(
  state = initialState,
  action: RelationshipActions
): RelationshipState {
  switch (action.type) {
    case GET_RELATIONSHIPS: {
      const { items } = action.payload;
      return {
        ...state,
        items,
      };
    }

    default:
      return state;
  }
}

// Selectors
export const selectRelationships = (state: RootState) =>
  state.relationships || initialState;
