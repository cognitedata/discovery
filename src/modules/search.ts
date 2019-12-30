import { Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { RootState } from '../reducers/index';

// Constants
export const SET_SEARCH_STATE = 'search/SET_SEARCH_STATE';

interface SetSearchState extends Action<typeof SET_SEARCH_STATE> {
  payload: {
    loading?: boolean;
    assetsTable?: number[];
    timeseriesTable?: number[];
    filesTable?: number[];
    threeDTable?: number[];
  };
}

type SearchAction = SetSearchState;

// Functions
export function setSearchLoading() {
  return async (dispatch: ThunkDispatch<any, void, SetSearchState>) => {
    dispatch({
      type: SET_SEARCH_STATE,
      payload: {
        loading: true,
      },
    });
  };
}
export function setAssetsTable(ids: number[]) {
  return async (dispatch: ThunkDispatch<any, void, SetSearchState>) => {
    dispatch({
      type: SET_SEARCH_STATE,
      payload: {
        assetsTable: ids,
        loading: false,
      },
    });
  };
}
export function setTimeseriesTable(ids: number[]) {
  return async (dispatch: ThunkDispatch<any, void, SetSearchState>) => {
    dispatch({
      type: SET_SEARCH_STATE,
      payload: {
        timeseriesTable: ids,
        loading: false,
      },
    });
  };
}
export function setFilesTable(ids: number[]) {
  return async (dispatch: ThunkDispatch<any, void, SetSearchState>) => {
    dispatch({
      type: SET_SEARCH_STATE,
      payload: {
        filesTable: ids,
        loading: false,
      },
    });
  };
}
export function setThreeDTable(ids: number[]) {
  return async (dispatch: ThunkDispatch<any, void, SetSearchState>) => {
    dispatch({
      type: SET_SEARCH_STATE,
      payload: {
        threeDTable: ids,
        loading: false,
      },
    });
  };
}

// Reducer
export interface SearchState {
  loading: boolean;
  assetsTable: number[];
  timeseriesTable: number[];
  filesTable: number[];
  threeDTable: number[];
}
const initialState: SearchState = {
  loading: true,
  assetsTable: [],
  timeseriesTable: [],
  filesTable: [],
  threeDTable: [],
};

export default function typesReducer(
  state = initialState,
  action: SearchAction
): SearchState {
  switch (action.type) {
    case SET_SEARCH_STATE: {
      return {
        ...state,
        ...action.payload,
      };
    }

    default:
      return state;
  }
}

// Selectors
export const selectSearchState = (state: RootState) => state.search;
