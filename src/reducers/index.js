import { combineReducers } from 'redux'
import comments from './comments'
import models from './models'
import revisions from './revisions'
import timeseries from './timeseries'

const rootReducer = combineReducers({
  comments,
  models,
  revisions,
  timeseries,
})

export default rootReducer
