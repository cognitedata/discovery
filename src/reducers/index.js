import { combineReducers } from 'redux'
import comments from './comments'
import models from './models'
import revisions from './revisions'
import timeseries from '../modules/timeseries'
import events from '../modules/events'

const rootReducer = combineReducers({
  comments,
  models,
  revisions,
  timeseries,
  events,
})

export default rootReducer
