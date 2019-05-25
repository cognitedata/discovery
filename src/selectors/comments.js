export const selectComments = (state, nodeId) => state.comments[nodeId] || { items: [], loading: false }
