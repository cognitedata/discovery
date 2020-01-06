import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import queryString from 'query-string';
import { replace } from 'connected-react-router';
import { Layout } from 'antd';
import Header from 'containers/Header';
import { sdk } from '../index';
import Loader from '../components/Loader';
import {
  selectAppState,
  setTenant,
  AppState,
  setCdfEnv,
  fetchUserGroups,
} from '../modules/app';
import { RootState } from '../reducers/index';
import SearchPage from './SearchPage';
import AssetPage from './AssetPage';
import { fetchModels } from '../modules/threed';

export const getCdfEnvFromUrl = () =>
  queryString.parse(window.location.search).env as string;

export const getApiKeyFromUrl = () =>
  queryString.parse(window.location.hash).apikey as string;

type Props = {
  app: AppState;
  match: { params: { tenant: string }; path: string };
  history: any;
  setCdfEnv: typeof setCdfEnv;
  setTenant: typeof setTenant;
  fetchUserGroups: typeof fetchUserGroups;
  fetchModels: typeof fetchModels;
  replace: typeof replace;
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
      app: { cdfEnv, tenant },
    } = this.props;
    const fromUrlCdfEnv = getCdfEnvFromUrl();
    const fromUrlApiKey = getApiKeyFromUrl();
    if (!cdfEnv && fromUrlCdfEnv) {
      this.props.setCdfEnv(fromUrlCdfEnv);
    }
    if (cdfEnv && !fromUrlCdfEnv) {
      if (tenant) {
        // if env is not visible via URL add it in
        this.props.replace({
          pathname: this.props.history.location.pathname,
          search: `?env=${cdfEnv}`,
          hash: `
            ${fromUrlApiKey ? `#apikey=${fromUrlApiKey}` : ''}`,
        });
      } else {
        this.props.setCdfEnv(undefined);
      }
    }
    const {
      match: {
        params: { tenant: pathTenant },
      },
    } = this.props;

    if (!tenant && pathTenant) {
      this.props.setTenant(pathTenant);
    }

    let status;

    if (fromUrlApiKey) {
      await sdk.loginWithApiKey({
        project: tenant || pathTenant,
        apiKey: fromUrlApiKey,
      });
      status = true;
    } else {
      await sdk.loginWithOAuth({ project: tenant || pathTenant });
      status = await sdk.authenticate();
    }
    this.setState(
      {
        auth: status !== null,
      },
      async () => {
        // clear `apikey`
        const queryParameters = queryString.parse(window.location.hash);
        delete queryParameters.apikey;
        window.location.hash = queryString.stringify(queryParameters);
        await this.props.fetchUserGroups();
        await this.props.fetchModels();
      }
    );
  };

  render() {
    // const { match } = this.props;
    if (!this.state.auth) {
      return <Loader />;
    }
    return (
      <>
        <Layout style={{ height: '100vh' }}>
          <Header />
          <Layout>
            <Layout.Content
              style={{
                height: '100vh',
                overflow: 'auto',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Switch>
                <Route path="/:tenant/" exact component={SearchPage} />
                <Route
                  path="/:tenant/search/:tab"
                  exact
                  component={SearchPage}
                />
                <Route
                  path="/:tenant/asset/:assetId"
                  exact
                  component={AssetPage}
                />
                <Route
                  path="/:tenant/asset/:assetId/:tab"
                  exact
                  component={AssetPage}
                />
                <Route
                  path="/:tenant/asset/:assetId/:tab/:itemId/:itemId2?/:itemId3?/"
                  exact
                  component={AssetPage}
                />
              </Switch>
            </Layout.Content>
          </Layout>
        </Layout>
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectAppState(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      setTenant,
      setCdfEnv,
      fetchUserGroups,
      fetchModels,
      replace,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Auth);
