import React from 'react'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { createBrowserHistory } from 'history'
import Auth from '../containers/Auth'
import Login from '../containers/Login'

export const history = createBrowserHistory()

function Routes() {
  return (
    <Router basename="/3d-reviewer">
      <Switch>
        <Route exact path="/" component={Login} />
        <Route path="/:tenant" component={Auth} />
      </Switch>
    </Router>
  )
}

export default Routes
