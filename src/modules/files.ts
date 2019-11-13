import { createAction } from 'redux-actions';
import { Dispatch, Action } from 'redux';
import { FilesMetadata } from '@cognite/sdk';
import { RootState } from '../reducers/index';
import { sdk } from '../index';
import { checkForAccessPermission } from '../utils/utils';

// Constants
export const ADD_FILES = 'files/SET_FILES';

interface AddFilesAction extends Action<typeof ADD_FILES> {
  payload: {
    assetId: number;
    items: FilesMetadata[];
  };
}

type FilesAction = AddFilesAction;

export const fetchFiles = (assetId: number) => async (
  dispatch: Dispatch,
  getState: () => RootState
) => {
  if (
    !checkForAccessPermission(getState().app.groups, 'filesAcl', 'READ', true)
  ) {
    return;
  }
  const result = await sdk.files.list({
    filter: { assetIds: [assetId] },
    limit: 1000,
  });
  const items = result.items.filter(file => file.uploaded === true);
  dispatch({ type: ADD_FILES, payload: { assetId, items } });
};

// Reducer
export interface FilesState {
  byAssetId: { [key: string]: FilesMetadata[] };
}
const initialState: FilesState = { byAssetId: {} };

export default function files(
  state = initialState,
  action: FilesAction
): FilesState {
  switch (action.type) {
    case ADD_FILES: {
      const { assetId, items } = action.payload;
      return {
        ...state,
        byAssetId: {
          ...state.byAssetId,
          [assetId]: items,
        },
      };
    }
    default:
      return state;
  }
}

// Action creators
const addFiles = createAction(ADD_FILES);

export const actions = {
  addFiles,
};

// Selectors
export const selectFiles = (state: RootState) =>
  state.files || { byAssetId: {} };
