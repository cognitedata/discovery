import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import { Button, Tabs, Descriptions, Spin } from 'antd';
import moment from 'moment';
import { AssetBreadcrumb, AssetTree } from '@cognite/gearbox';
import LoadingWrapper from 'components/LoadingWrapper';
import AddOrEditAssetModal from 'containers/Modals/AddOrEditAssetModal';
import { ExtendedAsset } from '../../modules/assets';
import { BetaTag } from '../../components/BetaWarning';
import { RootState } from '../../reducers/index';
import { TypesState, fetchTypeForAssets } from '../../modules/types';
import { canEditAssets } from '../../utils/PermissionsUtils';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 360px;
  padding: 16px;
  border-right: 1px solid #d9d9d9;

  h1 {
    margin-top: 12px;
    margin-bottom: 0px;
  }

  .ant-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .ant-tabs-content {
    flex: 1;
    position: relative;
    height: 0;
  }

  .ant-tabs-tabpane {
    overflow: auto;
  }

  .ant-breadcrumb {
    word-break: break-all;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  margin-bottom: 20px;
  margin-top: 24px;

  && > * {
    margin-left: 16px;
  }
  && > *:nth-child(1) {
    margin-left: 0px;
  }
`;

type OrigProps = {
  asset?: ExtendedAsset;
  onNavigateToPage: (type: string, id: number) => void;
  onDeleteAsset: () => void;
};

type Props = {
  types: TypesState;
  push: typeof push;
  fetchTypeForAssets: typeof fetchTypeForAssets;
} & OrigProps;

type State = { showEdit: boolean; showAddChild: boolean };

class AssetSidebar extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { showEdit: false, showAddChild: false };
  }

  componentDidMount() {
    if (this.props.asset && !this.props.types.items[this.props.asset.id]) {
      this.props.fetchTypeForAssets([this.props.asset.id]);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.asset &&
      (!prevProps.asset || this.props.asset.id !== prevProps.asset.id)
    ) {
      this.props.fetchTypeForAssets([this.props.asset.id]);
    }
  }

  renderType = () => {
    const {
      types: { byAssetId, items, error },
    } = this.props;

    if (error) {
      return <span>Unable To Load Schema</span>;
    }
    if (!byAssetId[this.props.asset!.id]) {
      return <Spin />;
    }
    return byAssetId[this.props.asset!.id]
      .map(el => (items[el.type.id] ? items[el.type.id].name : undefined))
      .filter(el => !!el)
      .map(type => <Button type="link">{type}</Button>);
  };

  render() {
    const { asset } = this.props;
    const { showEdit, showAddChild } = this.state;
    if (!asset) {
      return (
        <Wrapper>
          <LoadingWrapper>
            <p>Loading Asset...</p>
          </LoadingWrapper>
        </Wrapper>
      );
    }
    return (
      <Wrapper>
        <AssetBreadcrumb
          assetId={asset.id}
          onBreadcrumbClick={breadcrumb =>
            this.props.onNavigateToPage('asset', breadcrumb.id)
          }
        />
        <h1>{asset.name}</h1>
        <ButtonRow>
          <Button
            type="primary"
            shape="round"
            disabled={
              !canEditAssets(false) ||
              (!!asset.metadata && !!asset.metadata.SOURCE_DB)
            }
            onClick={() => this.setState({ showEdit: true })}
          >
            Edit
          </Button>
          <Button
            type="danger"
            shape="circle"
            icon="delete"
            disabled={
              !canEditAssets(false) ||
              (!!asset.metadata && !!asset.metadata.SOURCE_DB)
            }
            onClick={this.props.onDeleteAsset}
          />
        </ButtonRow>
        <Tabs size="small" tabBarGutter={6}>
          <Tabs.TabPane tab="Details" key="details">
            <Descriptions size="small" bordered column={1}>
              <Descriptions.Item label="Description">
                {asset.description}
              </Descriptions.Item>
              <Descriptions.Item label="External ID">
                {asset.externalId}
              </Descriptions.Item>
              <Descriptions.Item label="ID">{asset.id}</Descriptions.Item>
              <Descriptions.Item label="Source">
                {asset.source}
              </Descriptions.Item>
              <Descriptions.Item label="Created Time">
                {moment(asset.createdTime).format('YYYY-MM-DD hh:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Last Modified">
                {moment(asset.lastUpdatedTime).format('YYYY-MM-DD hh:mm')}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <span>
                    Types <BetaTag />
                  </span>
                }
              >
                {this.renderType()}
              </Descriptions.Item>
            </Descriptions>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Children" key="assets">
            <Button
              disabled={!canEditAssets(false)}
              onClick={() => {
                this.setState({ showAddChild: true });
              }}
            >
              Add Child Asset
            </Button>
            <AssetTree
              assetIds={[asset.id]}
              onSelect={selectedAsset => {
                if (selectedAsset.node) {
                  this.props.onNavigateToPage('asset', selectedAsset.node.id);
                }
              }}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Metadata" key="metadata">
            <pre>{JSON.stringify(asset.metadata, null, 2)}</pre>
          </Tabs.TabPane>
        </Tabs>
        {showEdit && (
          <AddOrEditAssetModal
            onClose={() => this.setState({ showEdit: false })}
            asset={this.props.asset}
          />
        )}
        {showAddChild && (
          <AddOrEditAssetModal
            onClose={newChild =>
              this.setState({ showAddChild: false }, () => {
                if (newChild) {
                  this.props.onNavigateToPage('asset', newChild.id);
                }
              })
            }
            parentAssetId={this.props.asset!.id}
          />
        )}
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return { types: state.types };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push, fetchTypeForAssets }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(AssetSidebar);
