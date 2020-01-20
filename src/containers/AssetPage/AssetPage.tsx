import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, Tabs, message, Modal, notification } from 'antd';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import AssetTreeViewerVX from 'containers/NetworkViewers/AssetTreeViewerVX';
import LoadingWrapper from 'components/LoadingWrapper';
import { AssetsState, fetchAsset, deleteAsset } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import AssetFilesSection from './AssetFilesSection';
import AssetSidebar from './AssetSidebar';
import AssetTimeseriesSection from './AssetTimeseriesSection';
import AssetEventsSection from './AssetEventsSection';
import AssetRelationshipSection from './AssetRelationshipSection';
import AssetCustomSection from './AssetCustomSection';
import AssetThreeDSection from './AssetThreeDSection';

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

export type AssetTabKeys =
  | 'hierarchy'
  | 'threed'
  | 'files'
  | 'pnid'
  | 'timeseries'
  | 'events'
  | 'relationships'
  | 'custom';

export const AssetTabNames: { [key in AssetTabKeys]: string } = {
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
  search: string;
  match: {
    params: {
      tab?: string;
      itemId?: number;
      itemId2?: number;
      itemId3?: number;
      assetId: number;
      tenant: string;
    };
  };
};

type Props = {
  assets: AssetsState;
  fetchAsset: typeof fetchAsset;
  deleteAsset: typeof deleteAsset;
  push: typeof push;
} & OrigProps;

type State = {};

class AssetPage extends React.Component<Props, State> {
  postDeleted = false;

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
    if (!this.asset && !this.postDeleted) {
      this.props.fetchAsset(this.props.match.params.assetId);
    }
  }

  get currentTab(): AssetTabKeys {
    return this.props.match.params.tab
      ? (this.props.match.params.tab as AssetTabKeys)
      : 'hierarchy';
  }

  get tenant() {
    return this.props.match.params.tenant;
  }

  get asset() {
    return this.props.assets.all[this.props.match.params.assetId];
  }

  get fileId() {
    return this.props.match.params.itemId;
  }

  get timeseriesId() {
    return this.props.match.params.itemId;
  }

  get modelId() {
    return this.props.match.params.itemId;
  }

  get eventId() {
    return this.props.match.params.itemId;
  }

  get revisionId() {
    return this.props.match.params.itemId2;
  }

  get nodeId() {
    return this.props.match.params.itemId3;
  }

  onBackClicked = () => {
    this.props.push(`/${this.props.match.params.tenant}/search/assets`);
  };

  onClearSelection = () => {
    this.props.push(
      `/${this.tenant}/asset/${this.asset.id}/${this.currentTab}`
    );
  };

  onSelect = (...ids: number[]) => {
    this.props.push(
      `/${this.tenant}/asset/${this.asset.id}/${this.currentTab}/${ids.join(
        '/'
      )}`
    );
  };

  onNavigateToPage = (type: string, ...ids: number[]) => {
    if (type === 'asset') {
      const { itemId, itemId2, itemId3 } = this.props.match.params;
      const secondaryIds = [itemId, itemId2, itemId3].filter(el => !!el);
      this.props.push({
        pathname: `/${this.tenant}/${type}/${ids.join('/')}/${
          this.currentTab
        }/${secondaryIds.join('/')}`,
        search: this.props.search,
      });
    } else {
      this.props.push(`/${this.tenant}/${type}/${ids.join('/')}`);
    }
  };

  onDeleteAsset = () => {
    Modal.confirm({
      title: 'Do you want to delete this asset?',
      content: 'This is a irreversible change',
      onOk: async () => {
        const { name, id } = this.asset!;
        this.postDeleted = true;
        await this.props.deleteAsset(id);
        notification.success({
          message: `Successfully Deleted ${name}`,
        });
        this.onBackClicked();
      },
      onCancel() {},
    });
  };

  renderCurrentTab = (tabKeys: AssetTabKeys) => {
    switch (tabKeys) {
      case 'custom': {
        return (
          <AssetCustomSection
            asset={this.asset!}
            search={this.props.search}
            tenant={this.tenant}
            onNavigateToPage={this.onNavigateToPage}
          />
        );
      }
      case 'relationships': {
        if (!this.asset) {
          return (
            <LoadingWrapper>
              <span>Loading Asset...</span>
            </LoadingWrapper>
          );
        }
        return (
          <AssetRelationshipSection
            asset={this.asset}
            onAssetClicked={id => this.onNavigateToPage('asset', id)}
          />
        );
      }
      case 'hierarchy': {
        if (!this.asset) {
          return (
            <LoadingWrapper>
              <span>Loading Asset...</span>
            </LoadingWrapper>
          );
        }
        return (
          <AssetTreeViewerVX
            asset={this.asset}
            onAssetClicked={id => this.onNavigateToPage('asset', id)}
          />
        );
      }
      case 'timeseries': {
        return (
          <AssetTimeseriesSection
            asset={this.asset}
            timeseriesId={this.timeseriesId}
            onSelect={id => this.onSelect(id)}
            onClearSelection={this.onClearSelection}
            onNavigateToPage={this.onNavigateToPage}
          />
        );
      }
      case 'files': {
        return (
          <AssetFilesSection
            asset={this.asset}
            fileId={this.fileId}
            onSelect={id => this.onSelect(id)}
            onClearSelection={this.onClearSelection}
            onNavigateToPage={this.onNavigateToPage}
          />
        );
      }
      case 'pnid': {
        return (
          <AssetFilesSection
            asset={this.asset}
            mimeTypes={['svg', 'SVG']}
            fileId={this.fileId}
            onSelect={id => this.onSelect(id)}
            onClearSelection={this.onClearSelection}
            onNavigateToPage={this.onNavigateToPage}
          />
        );
      }
      case 'events': {
        return (
          <AssetEventsSection
            asset={this.asset}
            eventId={this.eventId}
            onSelect={id => this.onSelect(id)}
            onClearSelection={this.onClearSelection}
            onNavigateToPage={this.onNavigateToPage}
          />
        );
      }
      case 'threed': {
        return (
          <AssetThreeDSection
            asset={this.asset}
            modelId={this.modelId}
            revisionId={this.revisionId}
            nodeId={this.nodeId}
            onAssetClicked={assetId =>
              message.success(`Coming soon ${assetId}`)
            }
            onRevisionClicked={(modelId, revisionId) =>
              this.onSelect(modelId, revisionId)
            }
            onNodeClicked={(modelId, revisionId, nodeId) =>
              this.onSelect(modelId, revisionId, nodeId)
            }
            onClearSelection={this.onClearSelection}
            onNavigateToPage={this.onNavigateToPage}
          />
        );
      }
    }
    return <h1>Unable to load component.</h1>;
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
        <Wrapper>
          <AssetSidebar
            asset={this.asset}
            onNavigateToPage={this.onNavigateToPage}
            onDeleteAsset={this.onDeleteAsset}
          />
          <AssetView>
            <Tabs
              tabBarGutter={0}
              activeKey={this.currentTab}
              onChange={key => {
                this.props.push(`/${tenant}/asset/${assetId}/${key}`);
              }}
            >
              {Object.keys(AssetTabNames).map(key => (
                <Tabs.TabPane
                  tab={AssetTabNames[key as AssetTabKeys]}
                  key={key}
                ></Tabs.TabPane>
              ))}
            </Tabs>
            <div className="content">
              {this.renderCurrentTab(this.currentTab)}
            </div>
          </AssetView>
        </Wrapper>
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    assets: state.assets,
    search: state.router.location.search,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push, fetchAsset, deleteAsset }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(AssetPage);
