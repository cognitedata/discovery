import { combineReducers } from 'redux';
import models from './models';
import revisions from './revisions';
import timeseries from '../modules/timeseries';
import events from '../modules/events';
import assets from '../modules/assets';
import types from '../modules/types';
import assetMappings from '../modules/assetmappings';

const rootReducer = combineReducers({
  models,
  revisions,
  timeseries,
  events,
  assets,
  assetMappings,
  types,
});

export default rootReducer;
