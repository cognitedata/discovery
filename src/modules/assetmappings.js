import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';

// Constants
export const ADD_ASSET_MAPPINGS = 'assetmappings/ADD_ASSET_MAPPINGS';

export function findBestMappingForNodeId(nodeId, mappings) {
  // See if there are any exact matches for this nodeId
  const assetIds = mappings
    .filter(mapping => mapping.nodeId === nodeId)
    .map(mapping => mapping.assetId);

  if (assetIds.length > 0) {
    // We found at least one exact match. There should not be more than one, but we'll choose the first one.
    const assetId = assetIds[0];

    // Now find all mappings pointing to this assetId as multiple 3D nodes may point to the same assetId.
    // Sort the list in descending order so first element has the largest subtreeSize.
    const filteredMappings = mappings.filter(
      mapping => mapping.assetId === assetId
    );
    return filteredMappings[0];
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

    dispatch({ type: ADD_ASSET_MAPPINGS, payload: { items: mappings } });
  };
}

export function fetchMappingsFromAssetId(modelId, revisionId, assetId) {
  return async dispatch => {
    const result = await sdk.ThreeD.listAssetMappings(modelId, revisionId, {
      assetId,
    });

    const mappings = result.items;
    if (mappings.length === 0) {
      return;
    }

    // Choose largest mapping
    mappings.sort((a, b) => a.subtreeSize - b.subtreeSize);
    dispatch({ type: ADD_ASSET_MAPPINGS, payload: { mapping: mappings[0] } });
  };
}

export function fetchMappingsFromNodeId(modelId, revisionId, nodeId) {
  return async dispatch => {
    const result = await sdk.ThreeD.listAssetMappings(modelId, revisionId, {
      nodeId,
    });

    const mappings = result.items;
    if (mappings.length === 0) {
      return;
    }

    const mapping = findBestMappingForNodeId(nodeId, mappings);
    dispatch({ type: ADD_ASSET_MAPPINGS, payload: { mapping } });
  };
}

export const AssetMappings = PropTypes.exact({
  byNodeId: PropTypes.objectOf(
    PropTypes.shape({
      assetId: PropTypes.number,
      treeIndex: PropTypes.number,
      subtreeSize: PropTypes.number,
    })
  ),
  byAssetId: PropTypes.objectOf(
    PropTypes.shape({
      nodeId: PropTypes.number,
      treeIndex: PropTypes.number,
      subtreeSize: PropTypes.number,
    })
  ),
});

// Reducer
const initialState = { byNodeId: {}, byAssetId: {} };

export default function assetmappings(state = initialState, action) {
  switch (action.type) {
    case ADD_ASSET_MAPPINGS: {
      const { mapping } = action.payload;
      state.byNodeId[mapping.nodeId] = mapping;
      state.byAssetId[mapping.assetId] = mapping;

      return {
        ...state,
        byNodeId: state.byNodeId,
        byAssetId: state.byAssetId,
      };
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
export const selectAssetMappings = state =>
  state.assetMappings || { byNodeId: {}, byAssetId: {} };
