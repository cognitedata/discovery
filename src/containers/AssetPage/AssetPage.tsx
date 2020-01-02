import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, Tabs } from 'antd';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import AssetTreeViewerVX from 'containers/NetworkViewers/AssetTreeViewerVX';
import { AssetsState, fetchAsset } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import LoadingWrapper from '../../components/LoadingWrapper';
import AssetFilesSection from './AssetFilesSection';
import AssetSidebar from './AssetSidebar';

const BackSection = styled.div`
  padding: 22px 26px;
  border-bottom: 1px solid #d9d9d9;
`;

const Wrapper = styled.div`
  display: flex;
  flex: 1;
  height: 0;
`;

const AssetView = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .ant-tabs-nav .ant-tabs-tab {
    padding-left: 32px;
    padding-right: 32px;
  }
  .ant-tabs-bar {
    margin-bottom: 0px;
  }
`;

type TabKeys =
  | 'hierarchy'
  | 'threed'
  | 'files'
  | 'pnid'
  | 'timeseries'
  | 'events'
  | 'relationships'
  | 'custom';

const TabNames: { [key in TabKeys]: string } = {
  hierarchy: 'Hierarchy',
  threed: '3D Models',
  files: 'Files',
  pnid: 'P&ID',
  timeseries: 'Timeseries',
  events: 'Events',
  relationships: 'Relationships',
  custom: 'Custom',
};

type OrigProps = {
  match: {
    params: {
      tab?: string;
      assetId: number;
      tenant: string;
    };
  };
};

type Props = {
  assets: AssetsState;
  fetchAsset: typeof fetchAsset;
  push: typeof push;
} & OrigProps;

type State = {};

class AssetPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    if (!this.asset) {
      this.props.fetchAsset(this.props.match.params.assetId);
    }
  }

  componentDidUpdate() {
    if (!this.asset) {
      this.props.fetchAsset(this.props.match.params.assetId);
    }
  }

  get currentTab(): TabKeys {
    return this.props.match.params.tab
      ? (this.props.match.params.tab as TabKeys)
      : 'hierarchy';
  }

  get asset() {
    return this.props.assets.all[this.props.match.params.assetId];
  }

  onBackClicked = () => {
    this.props.push(`/${this.props.match.params.tenant}/search/assets`);
  };

  renderCurrentTab = () => {
    switch (this.currentTab) {
      case 'hierarchy':
        return (
          <AssetTreeViewerVX asset={this.asset} onAssetClicked={console.log} />
        );
      case 'files':
        return <AssetFilesSection asset={this.asset} />;
    }
    return <h1>Hello</h1>;
  };

  render() {
    const { assetId, tenant } = this.props.match.params;
    return (
      <>
        <BackSection>
          <Button type="link" icon="arrow-left" onClick={this.onBackClicked}>
            Back to Search Result
          </Button>
        </BackSection>
        {this.asset ? (
          <Wrapper>
            <AssetSidebar asset={this.asset} />
            <AssetView>
              <Tabs
                tabBarGutter={0}
                activeKey={this.currentTab}
                onChange={key => {
                  this.props.push(`/${tenant}/asset/${assetId}/${key}`);
                }}
              >
                {Object.keys(TabNames).map(key => (
                  <Tabs.TabPane
                    tab={TabNames[key as TabKeys]}
                    key={key}
                  ></Tabs.TabPane>
                ))}
              </Tabs>
              <div style={{ flex: 1, height: 0 }}>
                {this.renderCurrentTab()}
              </div>
            </AssetView>
          </Wrapper>
        ) : (
          <LoadingWrapper>
            <p>Loading Asset...</p>
          </LoadingWrapper>
        )}
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    assets: state.assets,
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push, fetchAsset }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(AssetPage);
