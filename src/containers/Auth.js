import React from 'react'
import { connect } from 'react-redux';
import PropTypes from 'prop-types'
import { ReactAuthProvider } from '@cognite/react-auth';
import { Route, Redirect, Switch } from 'react-router-dom'
import Model from './Model'
import Models from './Models'
import Revisions from './Revisions'

const revisionUrl = `models/:modelId/revisions/:revisionId`;
const Auth = ({ tenant, match }) => (
  <ReactAuthProvider 
    project={tenant}
    redirectUrl={window.location.href}
    errorRedirectUrl={window.location.href}
    usePopup
    enableTokenCaching
  >
    <Switch>
      <Redirect exact strict from={`${match.url}/${revisionUrl}/`} to={`${match.url}/${revisionUrl}`} />
      <Route path={`${match.url}/models/:modelId/revisions/:revisionId`} component={Model} />
      <Route path={`${match.url}/models/:modelId/revisions`} component={Revisions} />
      <Route path={`${match.url}/models`} component={Models} />
    </Switch>
   </ReactAuthProvider>
)
Auth.propTypes = {
  tenant:  PropTypes.string.isRequired,
  match: PropTypes.shape({
    url: PropTypes.string.isRequired,
  }).isRequired,
}

const mapStateToProps = (_, ownProps) => {
  const { tenant } = ownProps.match.params;
  return { tenant }
}

export default connect(mapStateToProps)(Auth);
