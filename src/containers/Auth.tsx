import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Layout, Steps, message } from 'antd';
import { push } from 'connected-react-router';
import Main from './Main';
import { sdk } from '../index';
import Loader from '../components/Loader';
import {
  selectApp,
  setTenant,
  AppState,
  setAppCurrentPage,
  setAuthToken,
} from '../modules/app';
import { RootState } from '../reducers/index';
import TimeseriesPreview from './TimeseriesPreview';
import DataKitMainList from './DataKit/DataKitMainList';
import { selectDatakit, DataKitState } from '../modules/datakit';
import QualityCheck from './QualityCheck';

const { Content, Header } = Layout;

const StyledHeader = styled(Header)`
  && {
    display: flex;
    z-index: 100;
    padding-left: 24px;
    background: #fff;
    box-shadow: 0px 0px 8px #cdcdcd;
  }
  && button {
    margin-right: 12px;
  }
`;

type Props = {
  app: AppState;
  datakit: DataKitState;
  match: { params: { tenant: string }; path: string };
  setTenant: typeof setTenant;
  setAppCurrentPage: typeof setAppCurrentPage;
  setAuthToken: typeof setAuthToken;
  push: typeof push;
};

type State = {
  auth: boolean;
};

class Auth extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    auth: false,
  };

  async componentDidMount() {
    const status = await sdk.login.status();
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

    if (!status) {
      sdk.loginWithOAuth({
        project: tenant || pathTenant,
        onTokens: tokens => this.props.setAuthToken(tokens.accessToken),
      });
      await sdk.authenticate();
    }

    this.setState({
      auth: status !== null,
    });
  }

  async componentDidUpdate() {
    if (!this.state.auth) {
      const status = await sdk.login.status();
      if (status !== null) {
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({
          auth: true,
        });
      }
    }
  }

  changePath = (step: number) => {
    const { tenant, datakit } = this.props.app;
    switch (step) {
      case 1: {
        if (!datakit || !this.props.datakit[datakit]) {
          message.error('Select a datakit first to navigate!');
          return;
        }
        this.props.push(`/${tenant}/datakits/${datakit}/edit`);
        break;
      }
      case 2: {
        if (!datakit || !this.props.datakit[datakit]) {
          message.error('Select a datakit first to navigate!');
          return;
        }
        this.props.push(`/${tenant}/datakits/${datakit}/verify`);
        break;
      }
      case 3:
        message.info('Coming soon!');
        return;
      case 0:
      default:
        this.props.push(`/${tenant}/datakits`);
    }
    this.props.setAppCurrentPage(step);
  };

  render() {
    const {
      match,
      app: { datakit: datakitName, currentPage },
      datakit,
    } = this.props;
    if (!this.state.auth) {
      return <Loader />;
    }
    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        <TimeseriesPreview />
        <Layout>
          <Content
            style={{
              display: 'flex',
              height: '100vh',
              flexDirection: 'column',
            }}
          >
            <StyledHeader>
              <div style={{ flex: 1, alignSelf: 'center' }}>
                <Steps
                  current={currentPage}
                  onChange={this.changePath}
                  size="small"
                  style={{ maxWidth: '1200px' }}
                >
                  <Steps.Step title="Data Kit" />
                  <Steps.Step
                    title="Discovery"
                    subTitle={
                      <span
                        style={{
                          textOverflow: 'ellipsis',
                          maxWidth: '160px',
                          // this line hurts
                          display: 'table-cell',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                        }}
                      >
                        Kit:{' '}
                        {datakitName && datakit[datakitName]
                          ? datakitName
                          : 'None'}
                      </span>
                    }
                  />
                  <Steps.Step title="Quality Checks" />
                  <Steps.Step title="Deploy" />
                </Steps>
              </div>
              <a
                style={{ float: 'right', color: '#000', marginLeft: '12px' }}
                target="_blank"
                rel="noopener noreferrer"
                href="https://docs.cognite.com/discovery/blog/releasenotes.html"
              >
                {process.env.REACT_APP_VERSION}
              </a>
            </StyledHeader>
            <Switch>
              <Route
                path={`${match.path}/datakits`}
                exact
                component={DataKitMainList}
              />
              <Route
                path={`${match.path}/datakits/:datakit/edit`}
                exact
                component={Main}
              />
              <Route
                path={`${match.path}/datakits/:datakit/verify`}
                exact
                component={QualityCheck}
              />
              {/* <Route
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
              /> */}
              <Route component={DataKitMainList} />
            </Switch>
          </Content>
        </Layout>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
    datakit: selectDatakit(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      setTenant,
      setAuthToken,
      setAppCurrentPage,
      push,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Auth);
