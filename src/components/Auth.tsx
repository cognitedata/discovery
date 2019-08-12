import React from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';
import Main from '../containers/Main';
import { sdk } from '../index';
import Loader from './Loader';

type Props = {
  match: {
    url: string;
    params: { [key: string]: string };
  };
};

type State = {
  auth: boolean;
};

class Auth extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    auth: false
  };

  async componentWillMount() {
    const status = await sdk.login.status();
    const {
      match: {
        params: { tenant }
      }
    } = this.props;

    if (!status) {
      sdk.loginWithOAuth({ project: tenant });
      await sdk.authenticate();
    }

    this.setState({
      auth: status !== null
    });
  }
  async componentDidUpdate() {
    if (!this.state.auth) {
      const status = await sdk.login.status();
      if (status !== null) {
        this.setState({
          auth: true
        });
      }
    }
  }
  render() {
    const { match } = this.props;
    const {
      params: { tenant }
    } = match;
    if (!this.state.auth) {
      return <Loader />;
    }
    return (
      <>
        <Switch>
          {tenant === 'akerbp' && (
            <Redirect exact strict from={`${match.url}`} to={`${match.url}/asset/735563410190978`} />
          )}
          <Route component={Main} />
        </Switch>
      </>
    );
  }
}

export default Auth;
