import { Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { sdk } from 'utils/SDK';
import { createSelector } from 'reselect';
import { RootState } from '../reducers/index';
import { arrayToObjectById } from '../utils/utils';
import { canReadDataSets } from '../utils/PermissionsUtils';

// Constants
export const RETRIEVE_DATA_SET = 'types/RETRIEVE_DATA_SET';
export const RETRIEVE_DATA_SET_FAILED = 'types/RETRIEVE_DATA_SET_FAILED';
export const RETRIEVE_DATA_SET_FOR_ASSETS =
  'types/RETRIEVE_DATA_SET_FOR_ASSETS';

export interface DataSet {
  externalId: string;
  name: string;
  description: string;
  metadata: { [key: string]: any };
  writeProtected: boolean;
  id: number;
  createdTime: number;
  lastUpdatedTime: number;
}

interface FetchDataSetAction extends Action<typeof RETRIEVE_DATA_SET> {
  payload: { types: DataSet[] };
}
interface FetchDataSetFailedAction
  extends Action<typeof RETRIEVE_DATA_SET_FAILED> {}

type DataSetAction = FetchDataSetAction | FetchDataSetFailedAction;

// Reducer
export interface DataSetsState {
  error: boolean;
  items: { [key: number]: DataSet };
}

const initialState: DataSetsState = { items: {}, error: false };

export default function reducer(
  state = initialState,
  action: DataSetAction
): DataSetsState {
  switch (action.type) {
    case RETRIEVE_DATA_SET: {
      const { types } = action.payload;
      return {
        ...state,
        items: { ...state.items, ...arrayToObjectById(types) },
      };
    }
    case RETRIEVE_DATA_SET_FAILED: {
      return {
        ...state,
        error: true,
      };
    }

    default:
      return state;
  }
}

// Functions
export function fetchDataSets() {
  return async (
    dispatch: ThunkDispatch<
      any,
      void,
      FetchDataSetAction | FetchDataSetFailedAction
    >
  ) => {
    try {
      if (!canReadDataSets(false)) {
        throw new Error('Missing ACL for types');
      }
      const { project } = sdk;
      const response = await sdk.post(
        `/api/playground/projects/${project}/datasets/list`,
        {
          data: {},
        }
      );

      dispatch({
        type: RETRIEVE_DATA_SET,
        payload: {
          types: response.data.items as DataSet[],
        },
      });
    } catch (e) {
      dispatch({
        type: RETRIEVE_DATA_SET_FAILED,
      });
    }
  };
}

export function fetchDataSetByIds(typeIds: number[]) {
  return async (
    dispatch: ThunkDispatch<
      any,
      void,
      FetchDataSetAction | FetchDataSetFailedAction
    >
  ) => {
    try {
      if (!canReadDataSets()) {
        throw new Error('Missing ACL for types');
      }
      const { project } = sdk;
      const response = await sdk.post(
        `/api/playground/projects/${project}/datasets/byids`,
        {
          data: {
            items: typeIds.map(id => ({ id })),
          },
        }
      );

      dispatch({
        type: RETRIEVE_DATA_SET,
        payload: {
          types: response.data.items as DataSet[],
        },
      });
    } catch (e) {
      dispatch({
        type: RETRIEVE_DATA_SET_FAILED,
      });
    }
  };
}

// Selectors
export const getAllDataSets = createSelector(
  (state: RootState) => state.datasets.items,
  datasets => Object.values(datasets)
);
