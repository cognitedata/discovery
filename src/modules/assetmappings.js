import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';

// Constants
export const SET_ASSET_MAPPINGS = 'assetmappings/SET_ASSET_MAPPINGS';

// const findAssetFromMappings = (nodeId, mappings) => {
//   // See if there are any exact matches for this nodeId
//   const assetIds = mappings
//     .filter(mapping => mapping.nodeId === nodeId)
//     .map(mapping => mapping.assetId);

//   if (assetIds.length > 0) {
//     // We found at least one exact match. There should not be more than one, but we'll choose the first one.
//     const assetId = assetIds[0];

//     // Now find all mappings pointing to this assetId as multiple 3D nodes may point to the same assetId.
//     // Sort the list in descending order so first element has the largest subtreeSize.
//     const filteredMappings = mappings.filter(
//       mapping => mapping.assetId === assetId
//     );
//     return filteredMappings[0].assetId;
//   }

//   const filteredMappings = mappings.filter(
//     mapping => mapping.nodeId !== nodeId
//   );
//   if (filteredMappings.length > 0) {
//     // The node has no direct mapping, choose the next parent
//     return findAssetFromMappings(
//       filteredMappings[filteredMappings.length - 1].nodeId,
//       filteredMappings
//     );
//   }

//   return null;
// };

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
//   return async dispatch => {
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

export function getAllAssetMappings(modelId, revisionId, assetId) {
  return async dispatch => {
    let cursor;
    let mappings = [];
    do {
      // eslint-disable-next-line no-await-in-loop
      const result = await sdk.ThreeD.listAssetMappings(modelId, revisionId, {
        assetId,
        cursor,
      });
      mappings = mappings.concat(result.items);
      cursor = result.nextCursor;
    } while (cursor !== undefined);

    dispatch({ type: SET_ASSET_MAPPINGS, payload: { items: mappings } });
  };
}

export function getMappingsFromAssetId(modelId, revisionId, assetId) {
  return async dispatch => {
    const result = await sdk.ThreeD.listAssetMappings(modelId, revisionId, {
      assetId,
    });

    const mappings = result.items;
    dispatch({ type: SET_ASSET_MAPPINGS, payload: { items: mappings } });
  };
}

export const AssetMappings = PropTypes.exact({
  items: PropTypes.arrayOf(
    PropTypes.exact({
      assetId: PropTypes.number,
      nodeId: PropTypes.number,
      treeIndex: PropTypes.number,
      subtreeSize: PropTypes.number,
    })
  ),
});

// Reducer
const initialState = {};

export default function assets(state = initialState, action) {
  switch (action.type) {
    case SET_ASSET_MAPPINGS: {
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

// Action creators
const setAssetMappings = createAction(SET_ASSET_MAPPINGS);

export const actions = {
  setAssetMappings,
};

// Selectors
export const selectAssetMappings = state =>
  state.assetMappings || { items: [] };
