import { createAction } from 'redux-actions';
import { Dispatch, Action } from 'redux';
import { AssetMapping3D } from '@cognite/sdk';
import { message } from 'antd';
import { RootState } from '../reducers/index';
import { sdk } from '../index';
import { DELETE_ASSETS, DeleteAssetAction } from './assets';
import { trackUsage } from '../utils/metrics';
import { checkForAccessPermission } from '../utils/utils';

// Constants
export const ADD_ASSET_MAPPINGS = 'assetmappings/ADD_ASSET_MAPPINGS';
export const DELETE_ASSET_MAPPING = 'assetmappings/DELETE_ASSET_MAPPING';

export interface Mapping {
  nodeId: number;
  assetId: number;
}

export interface AddNodeAssetMappingAction
  extends Action<typeof ADD_ASSET_MAPPINGS> {
  payload: {
    mapping: AssetMapping3D;
    nodeId?: number;
    modelId: number;
    revisionId: number;
  };
}
interface DeleteAssetMappingAction extends Action<typeof DELETE_ASSET_MAPPING> {
  payload: { assetId: number };
}

type AssetMappingAction =
  | AddNodeAssetMappingAction
  | DeleteAssetMappingAction
  | DeleteAssetAction;

export function findBestMappingForNodeId(
  nodeId: number,
  mappings: Mapping[]
): null | Mapping {
  // See if there are any exact matches for this nodeId
  const assetIds = mappings
    .filter(mapping => mapping.nodeId === nodeId)
    .map(mapping => mapping.assetId);

  if (assetIds.length > 0) {
    // We found at least one exact match. There should not be more than one, but we'll choose the first one.
    const assetId = assetIds[0];

    // Now find all mappings pointing to this assetId as multiple 3D nodes may point to the same assetId.
    // Sort the list in descending order so first element has the largest subtreeSize.
    const mappingsPointingToAsset = mappings.filter(
      mapping => mapping.assetId === assetId
    );
    return mappingsPointingToAsset[0];
  }

  const filteredMappings = mappings.filter(
    mapping => mapping.nodeId !== nodeId
  );
  if (filteredMappings.length > 0) {
    // The node has no direct mapping, choose the next parent
    return findBestMappingForNodeId(
      filteredMappings[filteredMappings.length - 1].nodeId,
      filteredMappings
    );
  }

  return null;
}

type CurrentFetchingObject = {
  asset: { [key: string]: any };
  node: { [key: string]: any };
};
const currentFetching: CurrentFetchingObject = { asset: {}, node: {} };

export const fetchMappingsFromAssetId = (
  modelId: number,
  revisionId: number,
  assetId: number
) => async (dispatch: Dispatch, getState: () => RootState) => {
  if (
    !checkForAccessPermission(
      getState().app.groups,
      'threedAcl',
      'UPDATE',
      true
    )
  ) {
    return;
  }
  if (currentFetching.asset[`${modelId}-${assetId}-${assetId}`]) {
    // Currently fetching this
    return;
  }
  currentFetching.asset[`${modelId}-${assetId}-${assetId}`] = true;
  try {
    const result = await sdk.assetMappings3D.list(modelId, revisionId, {
      assetId,
    });

    const mappings: AssetMapping3D[] = result.items;
    if (mappings.length === 0) {
      return;
    }

    // Choose largest mapping
    mappings.sort((a, b) => a.subtreeSize! - b.subtreeSize!);
    dispatch({
      type: ADD_ASSET_MAPPINGS,
      payload: { mapping: mappings[0], modelId, revisionId },
    });
  } catch (ex) {
    // Could not fetch
  }

  currentFetching.asset[`${modelId}-${assetId}-${assetId}`] = false;
};

export function fetchMappingsFromNodeId(
  modelId: number,
  revisionId: number,
  nodeId: number
) {
  return async (dispatch: Dispatch) => {
    if (currentFetching.node[nodeId]) {
      // Currently fetching this
      return;
    }
    currentFetching.node[nodeId] = true;
    try {
      const result = await sdk.assetMappings3D.list(modelId, revisionId, {
        nodeId,
      });

      const mappings: AssetMapping3D[] = result.items;
      if (mappings.length === 0) {
        return;
      }

      const mapping = findBestMappingForNodeId(nodeId, mappings);
      dispatch({
        type: ADD_ASSET_MAPPINGS,
        payload: { mapping, nodeId, modelId, revisionId },
      });
    } catch (ex) {
      // Could not fetch
    }
    currentFetching.node[nodeId] = false;
  };
}

export function createAssetNodeMapping(
  modelId: number,
  revisionId: number,
  nodeId: number,
  assetId: number
) {
  return async (dispatch: Dispatch) => {
    trackUsage('AssetMappings.createAssetNodeMapping', {
      modelId,
      assetId,
    });
    try {
      const mappings = await sdk.assetMappings3D.create(modelId, revisionId, [
        {
          nodeId,
          assetId,
        },
      ]);

      if (mappings.length === 0) {
        return;
      }

      dispatch({
        type: ADD_ASSET_MAPPINGS,
        payload: { mapping: mappings[0], modelId, revisionId },
      });
    } catch (ex) {
      // Could not fetch
      message.error(
        'Unable to map asset to 3D node, make sure you have the correct permissions.'
      );
    }
  };
}
export function deleteAssetNodeMapping(
  modelId: number,
  revisionId: number,
  assetId: number
) {
  return async (dispatch: Dispatch, getState: () => RootState) => {
    trackUsage('AssetMappings.deleteAssetNodeMapping', {
      modelId,
      assetId,
    });
    const { byAssetId } = getState().assetMappings;
    if (byAssetId[assetId]) {
      try {
        await sdk.assetMappings3D.delete(modelId, revisionId, [
          {
            nodeId: byAssetId[assetId].nodeId,
            assetId: byAssetId[assetId].assetId,
          },
        ]);
      } catch (ex) {
        // Could not fetch
      }
    }
    dispatch({
      type: DELETE_ASSET_MAPPING,
      payload: { assetId },
    });
  };
}

// Reducer
export interface AssetMappingState {
  byNodeId: { [key: string]: any };
  byAssetId: { [key: string]: any };
}
const initialState: AssetMappingState = { byNodeId: {}, byAssetId: {} };

export default function assetmappings(
  state: AssetMappingState = initialState,
  action: AssetMappingAction
): AssetMappingState {
  switch (action.type) {
    case ADD_ASSET_MAPPINGS: {
      const { mapping, nodeId } = action.payload;

      return {
        ...state,
        byNodeId: {
          ...state.byNodeId,
          [mapping.nodeId]: mapping,
          ...(nodeId && { [nodeId]: mapping }),
        },
        byAssetId: {
          ...state.byAssetId,
          [mapping.assetId]: mapping,
        },
      };
    }

    case DELETE_ASSETS:
    case DELETE_ASSET_MAPPING: {
      const {
        [action.payload.assetId]: assetMapping,
        ...remainingAssetMapping
      } = state.byAssetId;

      if (assetMapping) {
        const {
          [assetMapping.nodeId]: nodeMapping,
          ...remainingNodeMapping
        } = state.byNodeId;
        return {
          ...state,
          byAssetId: remainingAssetMapping,
          byNodeId: remainingNodeMapping,
        };
      }
      return state;
    }

    default:
      return state;
  }
}

// Action creators
const addAssetMappings = createAction(ADD_ASSET_MAPPINGS);

export const actions = {
  addAssetMappings,
};

// Selectors
export const selectAssetMappings = (state: RootState) =>
  state.assetMappings || { byNodeId: {}, byAssetId: {} };
