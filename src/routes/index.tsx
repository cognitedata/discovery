import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { ConnectedRouter } from 'connected-react-router';
import Auth from '../containers/Auth';
import Login from '../containers/Login';
import { history } from '../store/index';

function Routes() {
  return (
    <ConnectedRouter history={history}>
      <Switch>
        <Route exact path="/" component={Login} />
        <Route path="/:tenant" component={Auth} />
      </Switch>
    </ConnectedRouter>
  );
}

export default Routes;
