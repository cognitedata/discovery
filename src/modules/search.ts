import { Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
  AssetFilter,
  TimeSeriesSearchDTO,
  FilesSearchFilter,
} from '@cognite/sdk';
import transform from 'lodash/transform';
import isEqual from 'lodash/isEqual';
import isObject from 'lodash/isObject';
import { RootState } from '../reducers/index';
import { trackUsage } from '../utils/Metrics';

const changes = (object: any, base: any) => {
  return transform(object, (result: any, value: any, key: string) => {
    if (!isEqual(value, base[key])) {
      // eslint-disable-next-line no-param-reassign
      result[key] =
        isObject(value) && isObject(base[key])
          ? changes(value, base[key])
          : value;
    }
  });
};

const difference = (object: any, base: any) => {
  return changes(object, base);
};

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
    trackUsage('Search.ChangeQuery', { query });
    const { assetFilter, timeseriesFilter, fileFilter } = getState().search;
    dispatch({
      type: SET_SEARCH_STATE,
      payload: {
        query,
        assetFilter: {
          ...assetFilter,
          search: { query: query.length > 0 ? query : undefined },
        },
        timeseriesFilter: {
          ...timeseriesFilter,
          search: { query: query.length > 0 ? query : undefined },
        },
        fileFilter: {
          ...fileFilter,
          search: { name: query.length > 0 ? query : undefined },
        },
        loading: true,
      },
    });
  };
}
export function setAssetFilter(assetFilter: AssetFilter) {
  return async (
    dispatch: ThunkDispatch<any, void, SetSearchState>,
    getState: () => RootState
  ) => {
    const { assetFilter: oldAssetFilter } = getState().search;
    trackUsage('Search.AssetQuery', {
      assetFilter: difference(assetFilter, oldAssetFilter),
    });
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
  return async (
    dispatch: ThunkDispatch<any, void, SetSearchState>,
    getState: () => RootState
  ) => {
    const { timeseriesFilter: oldFilter } = getState().search;
    trackUsage('Search.TimeseriesFilter', {
      assetFilter: difference(timeseriesFilter, oldFilter),
    });
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
  return async (
    dispatch: ThunkDispatch<any, void, SetSearchState>,
    getState: () => RootState
  ) => {
    const { fileFilter: oldFilter } = getState().search;
    trackUsage('Search.TimeseriesFilter', {
      assetFilter: difference(fileFilter, oldFilter),
    });
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
