import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Main from './Main';
import { sdk } from '../index';
import Loader from '../components/Loader';
import { selectApp, setTenant, AppState } from '../modules/app';
import { RootState } from '../reducers/index';

type Props = {
  app: AppState;
  match: { params: { tenant: string }; path: string };
  setTenant: typeof setTenant;
};

type State = {
  auth: boolean;
};

class Auth extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    auth: false,
  };

  async componentDidMount() {
    await this.verifyAuth();
  }

  async componentDidUpdate() {
    if (!this.state.auth) {
      await this.verifyAuth();
    }
  }

  verifyAuth = async () => {
    const {
      match: {
        params: { tenant: pathTenant },
      },
    } = this.props;
    const {
      app: { tenant },
    } = this.props;

    if (!tenant && pathTenant) {
      this.props.setTenant(pathTenant);
    }

    await sdk.loginWithOAuth({ project: tenant || pathTenant });
    const status = await sdk.authenticate();

    this.setState({
      auth: status !== null,
    });
  };

  render() {
    const { match } = this.props;
    if (!this.state.auth) {
      return <Loader />;
    }
    return (
      <>
        <Switch>
          <Route
            path={`${match.path}/asset/:rootAssetId`}
            exact
            component={Main}
          />
          <Route
            path={`${match.path}/asset/:rootAssetId/:assetId`}
            exact
            component={Main}
          />
          <Route
            path={`${match.path}/models/:modelId/:revisionId`}
            exact
            component={Main}
          />
          <Route
            path={`${match.path}/models/:modelId/:revisionId/:nodeId`}
            exact
            component={Main}
          />
          <Route component={Main} />
        </Switch>
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      setTenant,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Auth);
