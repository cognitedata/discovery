import { Dispatch, Action } from 'redux';
import { RootState } from '../reducers/index';

// Constants
export const ADD_DATAKIT = 'datakit/ADD_DATAKIT';
export const REMOVE_DATAKIT = 'datakit/REMOVE_DATAKIT';
export const ADD_TO_DATAKIT = 'datakit/ADD_TO_DATAKIT';
export const EDIT_DATAKIT = 'datakit/EDIT_DATAKIT';

const DATAKIT_LOCAL_STORAGE = 'datakit';

export interface DataKitItem {
  timeseriesId: number;
  query: {
    assetId?: number;
    assetName?: string;
    timeseriesName?: string;
  };
  alias?: string;
}
export interface DataKit {
  // TODO fix snould not just be name
  name: string;
  input: DataKitItem[];
  output: DataKitItem[];
}

interface CreateDataKitAction extends Action<typeof ADD_DATAKIT> {
  payload: DataKit;
}

interface RemoveDatakitAction extends Action<typeof REMOVE_DATAKIT> {
  payload: { name: string };
}

interface AddToDatakitAction extends Action<typeof ADD_TO_DATAKIT> {
  payload: {
    name: string;
    timeseriesId: number;
    alias?: string;
    output: boolean;
    query: {
      assetId?: number;
      assetName?: string;
      timeseriesName?: string;
    };
  };
}

export interface EditDatakitAction extends Action<typeof EDIT_DATAKIT> {
  payload: { name: string; datakit: DataKit };
}

type DatakitAction =
  | CreateDataKitAction
  | RemoveDatakitAction
  | EditDatakitAction
  | AddToDatakitAction;

// Functions
export function createDataKit(data: {
  name?: string;
  timeseriesId?: number;
  output?: boolean;
  assetId?: number;
  assetName?: string;
  timeseriesName?: string;
}) {
  return async (dispatch: Dispatch<CreateDataKitAction>) => {
    const {
      name,
      timeseriesId,
      output,
      assetId,
      assetName,
      timeseriesName,
    } = data;
    const nameString = name || new Date().toISOString();
    dispatch({
      type: ADD_DATAKIT,
      payload: {
        name: nameString,
        input:
          !output && timeseriesId
            ? [{ timeseriesId, query: { assetId, assetName, timeseriesName } }]
            : [],
        output:
          output && timeseriesId
            ? [{ timeseriesId, query: { assetId, assetName, timeseriesName } }]
            : [],
      },
    });
  };
}

export function removeDataKit(name: string) {
  return async (dispatch: Dispatch<RemoveDatakitAction>) => {
    dispatch({
      type: REMOVE_DATAKIT,
      payload: { name },
    });
  };
}

export function addToDataKit(
  name: string,
  timeseriesId: number,
  output = false,
  query: {
    assetId?: number;
    assetName?: string;
    timeseriesName?: string;
  }
) {
  return async (dispatch: Dispatch<AddToDatakitAction>) => {
    dispatch({
      type: ADD_TO_DATAKIT,
      payload: {
        name,
        timeseriesId,
        output,
        query,
      },
    });
  };
}

export function updateDataKit(name: string, modifiedDatakit: DataKit) {
  return async (dispatch: Dispatch<EditDatakitAction>) => {
    dispatch({
      type: EDIT_DATAKIT,
      payload: {
        name,
        datakit: modifiedDatakit,
      },
    });
  };
}
// Reducer
export interface DataKitState {
  [name: string]: DataKit;
}
const initialState: DataKitState = JSON.parse(
  localStorage.getItem(DATAKIT_LOCAL_STORAGE) || '{}'
);

export default function datakit(
  state = initialState,
  action: DatakitAction
): DataKitState {
  let newState = state;
  switch (action.type) {
    case ADD_DATAKIT:
      newState = {
        ...state,
        [action.payload.name]: action.payload,
      };
      break;
    case EDIT_DATAKIT:
      newState = {
        ...state,
        [action.payload.datakit.name]: action.payload.datakit,
      };
      if (action.payload.name !== action.payload.datakit.name) {
        delete newState[action.payload.name];
      }
      break;
    case REMOVE_DATAKIT:
      newState = {
        ...state,
      };
      delete newState[action.payload.name];
      break;
    case ADD_TO_DATAKIT: {
      const { name, timeseriesId, output, query, alias } = action.payload;
      newState = {
        ...state,
        [name]: {
          ...state[name],
          ...(output && {
            output: [...state[name].output, { timeseriesId, alias, query }],
          }),
          ...(!output && {
            input: [...state[name].input, { timeseriesId, alias, query }],
          }),
        },
      };
      break;
    }
    default:
      break;
  }
  localStorage.setItem(DATAKIT_LOCAL_STORAGE, JSON.stringify(newState));
  return newState;
}

// Selectors
export const selectDatakit = (state: RootState) => state.datakit || {};
