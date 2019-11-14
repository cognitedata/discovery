import { AnyAction, Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { message } from 'antd';
import { RootState } from '../reducers/index';
import { sdk } from '../index';
import { ExtendedAsset } from './assets';
import { checkForAccessPermission } from '../utils/utils';

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
        `/api/playground/projects/${project}/relationships`
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
export function fetchRelationshipsForAssetId(asset: ExtendedAsset) {
  return async (
    dispatch: ThunkDispatch<any, void, AnyAction>,
    getState: () => RootState
  ) => {
    const { groups } = getState().app;

    if (!checkForAccessPermission(groups, 'relationshipsAcl', 'READ', true)) {
      return;
    }

    try {
      const { project } = sdk;

      const [
        resultFrom,
        resultTo,
        resultFromExt,
        resultToExt,
      ] = await Promise.all([
        sdk.post(`/api/playground/projects/${project}/relationships/list`, {
          data: {
            filter: {
              sourceResource: 'asset',
              sourceResourceId: `${asset.id}`,
            },
          },
        }),
        sdk.post(`/api/playground/projects/${project}/relationships/list`, {
          data: {
            filter: {
              targetResource: 'asset',
              targetResourceId: `${asset.id}`,
            },
          },
        }),
        ...(asset.externalId
          ? [
              sdk.post(
                `/api/playground/projects/${project}/relationships/list`,
                {
                  data: {
                    filter: {
                      sourceResource: 'asset',
                      sourceResourceId: `${asset.externalId}`,
                    },
                  },
                }
              ),
              sdk.post(
                `/api/playground/projects/${project}/relationships/list`,
                {
                  data: {
                    filter: {
                      targetResource: 'asset',
                      targetResourceId: `${asset.externalId}`,
                    },
                  },
                }
              ),
            ]
          : []),
      ]);

      if (resultFrom.status === 200 && resultTo.status === 200) {
        let items = resultFrom.data.items.concat(resultTo.data.items);
        if (asset.externalId) {
          items = items
            .concat(resultFromExt.data.items)
            .concat(resultToExt.data.items);
        }
        dispatch({
          type: GET_RELATIONSHIPS,
          payload: { items },
        });
      } else {
        throw new Error('Unable to fetch relationships for given asset');
      }
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
