import { combineReducers } from 'redux';
import timeseries from '../modules/timeseries';
import events from '../modules/events';
import assets from '../modules/assets';
import types from '../modules/types';
import files from '../modules/files';
import filters from '../modules/filters';
import threed from '../modules/threed';
import search from '../modules/search';
import assetMappings from '../modules/assetmappings';

const rootReducer = combineReducers({
  timeseries,
  events,
  assets,
  assetMappings,
  types,
  files,
  filters,
  threed,
  search,
});

export default rootReducer;
