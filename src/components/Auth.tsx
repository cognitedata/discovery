import React from 'react';
import { ReactAuthProvider } from '@cognite/react-auth';
import { Route, Redirect, Switch } from 'react-router-dom';
import Main from '../containers/Main';

type Props = {
  match: {
    url: string;
    params: { [key: string]: string };
  };
};

const Auth = ({ match }: Props) => {
  const tenant = match.params.tenant;
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

export default Auth;
