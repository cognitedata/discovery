// TODO this can just be a component
import React from 'react';
import { connect } from 'react-redux';
import { ReactAuthProvider } from '@cognite/react-auth';
import { Route, Redirect, Switch } from 'react-router-dom';
import Main from './Main';
import { RootState } from '../reducers';

type OrigProps = {
  match: { params: { [key: string]: string } };
};

type Props = {
  tenant: string;
  match: {
    url: string;
  };
};

const Auth = ({ tenant, match }: Props) => {
  return (
    <ReactAuthProvider
      project={tenant}
      redirectUrl={window.location.href}
      errorRedirectUrl={window.location.href}
      usePopup
      enableTokenCaching
    >
      <Switch>
        {tenant === 'akerbp' && (
          <Redirect exact strict from={`${match.url}`} to={`${match.url}/asset/735563410190978`} />
        )}
        <Route component={Main} />
      </Switch>
    </ReactAuthProvider>
  );
};

const mapStateToProps = (_: RootState, ownProps: OrigProps) => {
  const tenant = ownProps.match.params.tenant;
  return { tenant };
};

export default connect(mapStateToProps)(Auth);
