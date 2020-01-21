import { Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
  AssetFilter,
  TimeSeriesSearchDTO,
  FilesSearchFilter,
} from '@cognite/sdk';
import { RootState } from '../reducers/index';

// Constants
export const SET_SEARCH_STATE = 'search/SET_SEARCH_STATE';

interface SetSearchState extends Action<typeof SET_SEARCH_STATE> {
  payload: {
    loading?: boolean;
    assetsTable?: { items: number[]; page: number; pageSize: number };
    timeseriesTable?: { items: number[]; page: number; pageSize: number };
    filesTable?: { items: number[]; page: number; pageSize: number };
    threeDTable?: { items: number[]; page: number; pageSize: number };
    assetFilter?: AssetFilter;
    timeseriesFilter?: TimeSeriesSearchDTO;
    fileFilter?: FilesSearchFilter;
    query?: string;
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
export function setAssetsTable(table: {
  items: number[];
  page: number;
  pageSize: number;
}) {
  return async (dispatch: ThunkDispatch<any, void, SetSearchState>) => {
    dispatch({
      type: SET_SEARCH_STATE,
      payload: {
        assetsTable: table,
        loading: false,
      },
    });
  };
}
export function setTimeseriesTable(table: {
  items: number[];
  page: number;
  pageSize: number;
}) {
  return async (dispatch: ThunkDispatch<any, void, SetSearchState>) => {
    dispatch({
      type: SET_SEARCH_STATE,
      payload: {
        timeseriesTable: table,
        loading: false,
      },
    });
  };
}
export function setFilesTable(table: {
  items: number[];
  page: number;
  pageSize: number;
}) {
  return async (dispatch: ThunkDispatch<any, void, SetSearchState>) => {
    dispatch({
      type: SET_SEARCH_STATE,
      payload: {
        filesTable: table,
        loading: false,
      },
    });
  };
}
export function setThreeDTable(table: {
  items: number[];
  page: number;
  pageSize: number;
}) {
  return async (dispatch: ThunkDispatch<any, void, SetSearchState>) => {
    dispatch({
      type: SET_SEARCH_STATE,
      payload: {
        threeDTable: table,
        loading: false,
      },
    });
  };
}
export function setSearchQuery(query: string) {
  return async (
    dispatch: ThunkDispatch<any, void, SetSearchState>,
    getState: () => RootState
  ) => {
    const { assetFilter, timeseriesFilter, fileFilter } = getState().search;
    dispatch({
      type: SET_SEARCH_STATE,
      payload: {
        query,
        assetFilter: {
          ...assetFilter,
          search: { query },
        },
        timeseriesFilter: {
          ...timeseriesFilter,
          search: { query },
        },
        fileFilter: {
          ...fileFilter,
          search: { name: query },
        },
        loading: true,
      },
    });
  };
}
export function setAssetFilter(assetFilter: AssetFilter) {
  return async (dispatch: ThunkDispatch<any, void, SetSearchState>) => {
    dispatch({
      type: SET_SEARCH_STATE,
      payload: {
        assetFilter,
        loading: true,
      },
    });
  };
}
export function setTimeseriesFilter(timeseriesFilter: TimeSeriesSearchDTO) {
  return async (dispatch: ThunkDispatch<any, void, SetSearchState>) => {
    dispatch({
      type: SET_SEARCH_STATE,
      payload: {
        timeseriesFilter,
        loading: true,
      },
    });
  };
}
export function setFileFilter(fileFilter: FilesSearchFilter) {
  return async (dispatch: ThunkDispatch<any, void, SetSearchState>) => {
    dispatch({
      type: SET_SEARCH_STATE,
      payload: {
        fileFilter,
        loading: true,
      },
    });
  };
}

// Reducer
export interface SearchState {
  loading: boolean;
  assetsTable: { items: number[]; page: number; pageSize: number };
  timeseriesTable: { items: number[]; page: number; pageSize: number };
  filesTable: { items: number[]; page: number; pageSize: number };
  threeDTable: { items: number[]; page: number; pageSize: number };
  assetFilter: AssetFilter;
  timeseriesFilter: TimeSeriesSearchDTO;
  fileFilter: FilesSearchFilter;
  query: string;
}
const initialState: SearchState = {
  loading: true,
  assetsTable: { items: [], page: 0, pageSize: 10 },
  timeseriesTable: { items: [], page: 0, pageSize: 10 },
  filesTable: { items: [], page: 0, pageSize: 10 },
  threeDTable: { items: [], page: 0, pageSize: 10 },
  assetFilter: {},
  timeseriesFilter: {},
  fileFilter: {},
  query: '',
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
