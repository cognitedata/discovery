import { combineReducers, Reducer } from 'redux';
import timeseries, { TimeseriesState } from '../modules/timeseries';
import events, { EventState } from '../modules/events';
import assets, { AssetsState } from '../modules/assets';
import types, { TypesState } from '../modules/types';
import files, { FilesState } from '../modules/files';
import filters, { FilterState } from '../modules/filters';
import threed, { ThreeDState } from '../modules/threed';
import assetMappings, { AssetMappingState } from '../modules/assetmappings';

const rootReducer: Reducer<RootState> = combineReducers({
  timeseries,
  events,
  assets,
  assetMappings,
  types,
  files,
  filters,
  threed
});

export interface RootState {
  timeseries: TimeseriesState;
  events: EventState;
  assets: AssetsState;
  types: TypesState;
  files: FilesState;
  filters: FilterState;
  threed: ThreeDState;
  assetMappings: AssetMappingState;
}

export default rootReducer;
