import { createAction, Action } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';
import { Dispatch } from 'redux';
import { Node, AssetMapping } from '@cognite/sdk';
import { RootState } from '../reducers/index';

// Constants
export const ADD_ASSET_MAPPINGS = 'assetmappings/ADD_ASSET_MAPPINGS';

export interface Mapping {
  nodeId: number;
  assetId: number;
}

interface AddAction extends Action<{ mapping: AssetMapping; nodeId?: number }> {}

type AssetMappingAction = AddAction;

export function findBestMappingForNodeId(nodeId: number, mappings: Mapping[]): null | Mapping {
  // See if there are any exact matches for this nodeId
  const assetIds = mappings.filter(mapping => mapping.nodeId === nodeId).map(mapping => mapping.assetId);

  if (assetIds.length > 0) {
    // We found at least one exact match. There should not be more than one, but we'll choose the first one.
    const assetId = assetIds[0];

    // Now find all mappings pointing to this assetId as multiple 3D nodes may point to the same assetId.
    // Sort the list in descending order so first element has the largest subtreeSize.
    const filteredMappings = mappings.filter(mapping => mapping.assetId === assetId);
    return filteredMappings[0];
  }

  const filteredMappings = mappings.filter(mapping => mapping.nodeId !== nodeId);
  if (filteredMappings.length > 0) {
    // The node has no direct mapping, choose the next parent
    return findBestMappingForNodeId(filteredMappings[filteredMappings.length - 1].nodeId, filteredMappings);
  }

  return null;
}

// const fetchAssetMappingsFromNodeId = async (modelId, revisionId, nodeId) => {
//   const data = await sdk.ThreeD.listAssetMappings(modelId, revisionId, {
//     nodeId,
//   });

//   // Sort in descending order on subtreeSize
//   const mappings = data.items.sort((a, b) => b.subtreeSize - a.subtreeSize);

//   return mappings;
// };

// Functions
// export function getAssetIdFromNodeId(modelId, revisionId, nodeId) {
//   return async (dispatch: Dispatch) => {
//     const mappings = await fetchAssetMappingsFromNodeId(
//       modelId,
//       revisionId,
//       nodeId
//     );
//     const assetId = findAssetFromMappings(nodeId, mappings);
//     dispatch({ type: SET_ASSET_ID, payload: { assetId } });
//     return assetId;
//   }
// }

// TODO: Verify cuz right now it is NOT USED
// export function getAllAssetMappings(modelId: number, revisionId: number, assetId: number) {
//   return async (dispatch: Dispatch) => {
//     let cursor;
//     let mappings: Mapping[] = [];
//     do {
//       // eslint-disable-next-line no-await-in-loop
//       const result: sdk.DataWithCursor<sdk.AssetMapping> = await sdk.ThreeD.listAssetMappings(modelId, revisionId, {
//         assetId,
//         cursor
//       });
//       mappings = mappings.concat(result.items);
//       cursor = result.nextCursor;
//     } while (cursor !== undefined);

//     dispatch({ type: ADD_ASSET_MAPPINGS, payload: { items: mappings } });
//   };
// }

type CurrentFetchingObject = {
  asset: { [key: string]: any };
  node: { [key: string]: any };
};
const currentFetching: CurrentFetchingObject = { asset: {}, node: {} };

export function fetchMappingsFromAssetId(modelId: number, revisionId: number, assetId: number) {
  return async (dispatch: Dispatch) => {
    if (currentFetching.asset[assetId]) {
      // Currently fetching this
      return;
    }
    currentFetching.asset[assetId] = true;
    try {
      const result = await sdk.ThreeD.listAssetMappings(modelId, revisionId, {
        assetId
      });

      const mappings: AssetMapping[] = result.items;
      if (mappings.length === 0) {
        return;
      }

      // Choose largest mapping
      mappings.sort((a, b) => (a.subtreeSize || 0) - (b.subtreeSize || 0));
      dispatch({ type: ADD_ASSET_MAPPINGS, payload: { mapping: mappings[0] } });
    } catch (ex) {
      // Could not fetch
    }

    currentFetching.asset[assetId] = false;
  };
}

export function fetchMappingsFromNodeId(modelId: number, revisionId: number, nodeId: number) {
  return async (dispatch: Dispatch) => {
    if (currentFetching.node[nodeId]) {
      // Currently fetching this
      return;
    }
    currentFetching.node[nodeId] = true;
    try {
      const result = await sdk.ThreeD.listAssetMappings(modelId, revisionId, {
        nodeId
      });

      const mappings = result.items;
      if (mappings.length === 0) {
        return;
      }

      const mapping = findBestMappingForNodeId(nodeId, mappings);
      dispatch({ type: ADD_ASSET_MAPPINGS, payload: { mapping, nodeId } });
    } catch (ex) {
      // Could not fetch
    }
    currentFetching.node[nodeId] = false;
  };
}
// TODO remove
// export const AssetMappings = PropTypes.exact({
//   byNodeId: PropTypes.objectOf(
//     PropTypes.shape({
//       assetId: PropTypes.number,
//       treeIndex: PropTypes.number,
//       subtreeSize: PropTypes.number
//     })
//   ),
//   byAssetId: PropTypes.objectOf(
//     PropTypes.shape({
//       nodeId: PropTypes.number,
//       treeIndex: PropTypes.number,
//       subtreeSize: PropTypes.number
//     })
//   )
// });

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
      state.byNodeId[mapping.nodeId] = mapping;
      state.byAssetId[mapping.assetId] = mapping;
      if (nodeId) {
        // We may have an asset mapping that is for a parent node.
        // So make sure this node also gets mapped.
        state.byNodeId[nodeId] = mapping;
      }

      return {
        ...state,
        byNodeId: state.byNodeId,
        byAssetId: state.byAssetId
      };
    }
    default:
      return state;
  }
}

// Action creators
const addAssetMappings = createAction(ADD_ASSET_MAPPINGS);

export const actions = {
  addAssetMappings
};

// Selectors
export const selectAssetMappings = (state: RootState) => state.assetMappings || { byNodeId: {}, byAssetId: {} };
