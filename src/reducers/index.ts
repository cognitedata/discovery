import { combineReducers } from 'redux';
import { History } from 'history';
import { connectRouter, RouterState } from 'connected-react-router';
import timeseries, { TimeseriesState } from '../modules/timeseries';
import events, { EventState } from '../modules/events';
import assets, { AssetsState } from '../modules/assets';
import types, { TypesState } from '../modules/types';
import files, { FilesState } from '../modules/files';
import filters, { FilterState } from '../modules/filters';
import threed, { ThreeDState } from '../modules/threed';
import assetMappings, { AssetMappingState } from '../modules/assetmappings';
import app, { AppState } from '../modules/app';
import datakit, { DataKitState } from '../modules/datakit';
import relationships, { RelationshipState } from '../modules/relationships';

const createRootReducer = (history: History) =>
  combineReducers({
    timeseries,
    events,
    assets,
    assetMappings,
    types,
    files,
    filters,
    threed,
    app,
    datakit,
    relationships,
    router: connectRouter(history),
  });

export interface RootState {
  timeseries: TimeseriesState;
  events: EventState;
  assets: AssetsState;
  types: TypesState;
  files: FilesState;
  filters: FilterState;
  threed: ThreeDState;
  relationships: RelationshipState;
  assetMappings: AssetMappingState;
  app: AppState;
  datakit: DataKitState;
  router: RouterState;
}

export default createRootReducer;
