import { AnyAction, Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { message } from 'antd';
import { RootState } from '../reducers/index';
import { sdk } from '../index';

// Constants
export const GET_RELATIONSHIPS = 'relationships/GET_RELATIONSHIPS';

export interface Relationship {
  [key: string]: any;
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
export function fetchRelationshipsForId(id: number) {
  return async (dispatch: ThunkDispatch<any, void, AnyAction>) => {
    try {
      const { project } = sdk;
      const response = await sdk.post(
        `https://api.cognitedata.com/api/playground/projects/${project}/relationships`,
        {
          data: {
            items: [{ externalId: id }],
          },
        }
      );

      if (response.status === 200) {
        dispatch({
          type: GET_RELATIONSHIPS,
          payload: { items: response.data.items },
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

export default function types(
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