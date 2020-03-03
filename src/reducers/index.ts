import { combineReducers } from 'redux';
import { History } from 'history';
import { connectRouter } from 'connected-react-router';
import timeseries from '../modules/timeseries';
import events from '../modules/events';
import assets from '../modules/assets';
import types from '../modules/types';
import files from '../modules/files';
import threed from '../modules/threed';
import assetMappings from '../modules/assetmappings';
import app from '../modules/app';
import search from '../modules/search';
import datasets from '../modules/datasets';
import relationships from '../modules/relationships';

const createRootReducer = (history: History) =>
  combineReducers({
    timeseries,
    events,
    assets,
    assetMappings,
    types,
    files,
    threed,
    app,
    relationships,
    search,
    datasets,
    router: connectRouter(history),
  });

export type RootState = ReturnType<ReturnType<typeof createRootReducer>>;

export default createRootReducer;
