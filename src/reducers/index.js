import { combineReducers } from 'redux'
import comments from './comments'
import models from './models'
import revisions from './revisions'

const rootReducer = combineReducers({
  comments,
  models,
  revisions,
})

export default rootReducer
