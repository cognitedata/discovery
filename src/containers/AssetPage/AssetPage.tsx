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
import AssetTimeseriesSection from './AssetTimeseriesSection';

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
  .content {
    flex: 1;
    height: 0;
    display: flex;
    flex-direction: column;
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
      itemId?: number;
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

  get tenant() {
    return this.props.match.params.tenant;
  }

  get asset() {
    return this.props.assets.all[this.props.match.params.assetId];
  }

  get itemId() {
    return this.props.match.params.itemId;
  }

  onBackClicked = () => {
    this.props.push(`/${this.props.match.params.tenant}/search/assets`);
  };

  onClearSelection = () => {
    this.props.push(
      `/${this.tenant}/asset/${this.asset.id}/${this.currentTab}`
    );
  };

  onSelect = (id: number) => {
    this.props.push(
      `/${this.tenant}/asset/${this.asset.id}/${this.currentTab}/${id}`
    );
  };

  onViewDetails = (type: string, id: number) => {
    this.props.push(`/${this.tenant}/${type}/${id}`);
  };

  renderCurrentTab = () => {
    switch (this.currentTab) {
      case 'hierarchy': {
        return (
          <AssetTreeViewerVX
            asset={this.asset}
            onAssetClicked={id =>
              this.props.push(`/${this.tenant}/asset/${id}/${this.currentTab}`)
            }
          />
        );
      }
      case 'timeseries': {
        return (
          <AssetTimeseriesSection
            asset={this.asset}
            timeseriesId={this.itemId}
            onSelect={id =>
              this.props.push(
                `/${this.tenant}/asset/${this.asset.id}/${this.currentTab}/${id}`
              )
            }
            onClearSelection={this.onClearSelection}
            onViewDetails={this.onViewDetails}
          />
        );
      }
      case 'files': {
        return (
          <AssetFilesSection
            asset={this.asset}
            fileId={this.itemId}
            onSelect={this.onSelect}
            onClearSelection={this.onClearSelection}
            onViewDetails={this.onViewDetails}
          />
        );
      }
      case 'pnid': {
        return (
          <AssetFilesSection
            asset={this.asset}
            mimeTypes={['svg', 'SVG']}
            fileId={this.itemId}
            onSelect={this.onSelect}
            onClearSelection={this.onClearSelection}
            onViewDetails={this.onViewDetails}
          />
        );
      }
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
              <div className="content">{this.renderCurrentTab()}</div>
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
