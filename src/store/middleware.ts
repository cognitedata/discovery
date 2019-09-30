import { ThunkDispatch } from 'redux-thunk';
import { Middleware } from 'redux';
import { RootState } from '../reducers/index';
import {
  resetAppState,
  setTenant,
  SetAppStateAction,
  setAssetId,
  setModelAndRevisionAndNode,
} from '../modules/app';

export const locationStateMiddleware: Middleware<
  {},
  RootState,
  ThunkDispatch<any, any, SetAppStateAction>
> = store => next => action => {
  const response = next(action);
  // See if extra action should be done when a back is pressed.
  if (
    action.type === '@@router/LOCATION_CHANGE' &&
    action.payload.type !== 'PUSH'
  ) {
    const { app } = store.getState();
    const [, tenant, type, p1, p2, p3] = action.payload.location.pathname.split(
      '/'
    );
    if (type === 'asset') {
      const rootAssetId =
        p1 && !Number.isNaN(parseFloat(p1)) ? Number(p1) : undefined;
      const assetId =
        p2 && !Number.isNaN(parseFloat(p2)) ? Number(p2) : undefined;
      if (
        rootAssetId &&
        assetId &&
        (rootAssetId !== app.rootAssetId || assetId !== app.assetId)
      ) {
        store.dispatch(setAssetId(rootAssetId!, assetId!, false));
      }
    } else if (type === 'models') {
      const modelId =
        p1 && !Number.isNaN(parseFloat(p1)) ? Number(p1) : undefined;
      const revisionId =
        p2 && !Number.isNaN(parseFloat(p2)) ? Number(p2) : undefined;
      const nodeId =
        p3 && !Number.isNaN(parseFloat(p3)) ? Number(p3) : undefined;
      if (
        modelId &&
        revisionId &&
        (modelId !== app.modelId ||
          revisionId !== app.revisionId ||
          nodeId !== app.nodeId)
      ) {
        store.dispatch(
          setModelAndRevisionAndNode(modelId!, revisionId!, nodeId, false)
        );
      }
    } else if (app.tenant !== tenant) {
      store.dispatch(setTenant(tenant, undefined, false));
    } else if (!p1 && (app.rootAssetId || app.modelId)) {
      store.dispatch(resetAppState());
    }
  }
  return response;
};
