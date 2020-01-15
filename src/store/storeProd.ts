import { createStore, applyMiddleware } from 'redux';
import ReduxThunk from 'redux-thunk';
import { routerMiddleware } from 'connected-react-router';
import createRootReducer from '../reducers';
import { history } from '../routes/index';

const middlewares = [ReduxThunk, routerMiddleware(history)];
const enhancer = [applyMiddleware(...middlewares)];

export default function configureStore(initialState = {}) {
  return createStore(createRootReducer(history), initialState, ...enhancer);
}
