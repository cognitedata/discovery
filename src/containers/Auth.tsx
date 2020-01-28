import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import queryString from 'query-string';
import { replace } from 'connected-react-router';
import { Layout, notification } from 'antd';
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
import { fetchModels } from '../modules/threed';
import SearchPage from './SearchPage';
import AssetPage from './AssetPage';
import TimeseriesPage from './TimeseriesPage';
import FilePage from './FilePage';
import ThreeDPage from './ThreeDPage';
import RelationshipPage from './RelationshipPage';
import { fetchTypes } from '../modules/types';
import { trackUsage } from '../utils/Metrics';
import PrivacyDisclaimer from '../components/PrivacyDisclaimer';

export const getCdfEnvFromUrl = () =>
  queryString.parse(window.location.search).env as string;

export const getApiKeyFromUrl = () =>
  window.localStorage.getItem('apikey') ||
  (queryString.parse(window.location.hash).apikey as string);

type Props = {
  app: AppState;
  match: { params: { tenant: string }; path: string };
  history: any;
  setCdfEnv: typeof setCdfEnv;
  setTenant: typeof setTenant;
  fetchUserGroups: typeof fetchUserGroups;
  fetchModels: typeof fetchModels;
  fetchTypes: typeof fetchTypes;
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
      try {
        await sdk.login.status();
        status = true;
      } catch (e) {
        status = false;
      }
    } else {
      await sdk.loginWithOAuth({ project: tenant || pathTenant });
      status = await sdk.authenticate();
    }
    trackUsage('App.Load', {
      tenant: tenant || pathTenant,
      status: !!status,
    });
    this.setState(
      {
        auth: !!status,
      },
      async () => {
        if (this.state.auth) {
          // clear `apikey`
          const queryParameters = queryString.parse(window.location.hash);
          delete queryParameters.apikey;
          window.location.hash = queryString.stringify(queryParameters);
          await this.props.fetchUserGroups();
          await this.props.fetchModels();
          await this.props.fetchTypes();
        } else {
          notification.error({
            message: 'Unable to authenticate',
            description:
              'Make sure that you are using the correct OAuth account or apikey. Make sure there is no apikey parameter in local storage.',
          });
        }
      }
    );
  };

  render() {
    // const { match } = this.props;
    if (!this.props.app.loaded) {
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
                  path="/:tenant/relationships"
                  exact
                  component={RelationshipPage}
                />
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
                <Route
                  path="/:tenant/timeseries/:timeseriesId"
                  exact
                  component={TimeseriesPage}
                />
                <Route
                  path="/:tenant/file/:fileId"
                  exact
                  component={FilePage}
                />
                <Route
                  path="/:tenant/threed/:modelId/:revisionId/"
                  exact
                  component={ThreeDPage}
                />
                <Route
                  path="/:tenant/threed/:modelId/:revisionId/node/:nodeId?"
                  exact
                  component={ThreeDPage}
                />
                <Route
                  path="/:tenant/threed/:modelId/:revisionId/asset/:assetId?"
                  exact
                  component={ThreeDPage}
                />
              </Switch>
            </Layout.Content>
            <PrivacyDisclaimer />
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
      fetchTypes,
      replace,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Auth);
