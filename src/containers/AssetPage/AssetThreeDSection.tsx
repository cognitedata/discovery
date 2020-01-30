import React, { Component } from 'react';
import { Table, Button, message } from 'antd';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import Placeholder from 'components/Placeholder';
import VerticallyCenteredRow from 'components/VerticallyCenteredRow';
import styled from 'styled-components';
import { Asset, RevealNode3D } from '@cognite/sdk';
import ThreeDCard from 'containers/ThreeDPage/ThreeDCard';
import { deleteAssetNodeMapping } from 'modules/assetmappings';
import { fetchModels, ThreeDState, ThreeDModel } from '../../modules/threed';
import { RootState } from '../../reducers/index';
import {
  fetchMappingsFromAssetId,
  createAssetNodeMapping,
} from '../../modules/assetmappings';
import Model3D from '../../components/Model3D';
import { ExtendedAsset } from '../../modules/assets';
import ViewingDetailsNavBar from '../../components/ViewingDetailsNavBar';
import FlexTableWrapper from '../../components/FlexTableWrapper';
import { sdk } from '../../index';
import { canReadThreeD } from '../../utils/PermissionsUtils';
import { trackUsage } from '../../utils/Metrics';

const Wrapper = styled.div`
  height: 100%;
  padding: 24px 56px;
  display: flex;
  flex-direction: column;

  h1 {
    margin-top: 12px;
    margin-bottom: 0px;
  }
`;

type OrigProps = {
  asset?: ExtendedAsset;
  modelId?: number;
  revisionId?: number;
  nodeId?: number;
  onAssetClicked: (id: number) => void;
  onNodeClicked: (modelId: number, revisionId: number, nodeId: number) => void;
  onRevisionClicked: (modelId: number, revisionId: number) => void;
  onClearSelection: () => void;
  onNavigateToPage: (type: string, ...ids: any[]) => void;
};

type Props = {
  fetchMappingsFromAssetId: typeof fetchMappingsFromAssetId;
  createAssetNodeMapping: typeof createAssetNodeMapping;
  deleteAssetNodeMapping: typeof deleteAssetNodeMapping;
  fetchModels: typeof fetchModels;
  threed: ThreeDState;
  selectedModel: ThreeDModel | undefined;
} & OrigProps;

type State = {
  nodeIds?: number[];
  selectedItem?: {
    asset?: Asset;
    node?: RevealNode3D;
  };
};
class AssetThreeDSection extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  async componentDidMount() {
    this.setState({ nodeIds: await this.getNodeIds() });
    if (this.props.nodeId) {
      this.onNodeSelected(this.props.nodeId, false);
    } else if (this.props.asset) {
      this.onAssetSelected(this.props.asset.id, false);
    }
  }

  async componentDidUpdate(prevProps: Props) {
    const { asset, nodeId } = this.props;
    if (
      this.props.modelId &&
      prevProps.modelId !== this.props.modelId &&
      this.props.revisionId &&
      prevProps.revisionId !== this.props.revisionId
    ) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        nodeIds: await this.getNodeIds(),
        selectedItem: undefined,
      });
    } else if (asset && (!prevProps.asset || prevProps.asset.id !== asset.id)) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        nodeIds: await this.getNodeIds(),
        selectedItem: undefined,
      });
      this.onAssetSelected(asset.id, false);
    } else if (nodeId !== prevProps.nodeId) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        nodeIds: await this.getNodeIds(),
        selectedItem: undefined,
      });
      this.onNodeSelected(nodeId, false);
    }
  }

  getNodeIds = async () => {
    const { nodeId, revisionId, modelId, asset } = this.props;
    if (!canReadThreeD(false)) {
      return [];
    }
    if (nodeId) {
      return [nodeId];
    }
    if (modelId && revisionId) {
      if (asset && asset.id) {
        const mappings = await sdk.assetMappings3D
          .list(modelId, revisionId, {
            assetId: asset.id,
          })
          .autoPagingToArray({ limit: -1 });
        return mappings.map(el => el.nodeId);
      }
    }

    return undefined;
  };

  onAssetSelected = async (assetId: number, navigateAway = true) => {
    trackUsage('AssetPage.ThreeDSection.AssetClicked', {
      assetId,
      navigateAway,
    });
    const { modelId, revisionId } = this.props;
    if (!canReadThreeD(navigateAway)) {
      return;
    }
    if (modelId && revisionId) {
      const {
        items: [mapping],
      } = await sdk.assetMappings3D.list(modelId, revisionId, {
        assetId,
      });
      let asset: Asset | undefined;
      if (mapping) {
        [asset] = await sdk.assets.retrieve([{ id: assetId }]);
      }
      this.setState({
        selectedItem: {
          asset,
        },
      });
      if (navigateAway) {
        this.props.onAssetClicked(assetId);
      }
    }
  };

  onNodeSelected = async (nodeId?: number, navigateAway = true) => {
    trackUsage('AssetPage.ThreeDSection.NodeClicked', {
      nodeId,
      navigateAway,
    });
    const { modelId, revisionId } = this.props;
    if (!canReadThreeD(navigateAway)) {
      return;
    }

    if (modelId && revisionId) {
      if (nodeId) {
        if (navigateAway) {
          this.props.onNodeClicked(modelId, revisionId, nodeId);
        }
        const {
          items: [node],
        } = await sdk.viewer3D.listRevealNodes3D(modelId, revisionId, {
          nodeId,
          depth: 0,
        });
        const {
          items: [mapping],
        } = await sdk.assetMappings3D.list(modelId, revisionId, {
          nodeId: node.id,
        });
        let asset: Asset | undefined;
        if (mapping) {
          [asset] = await sdk.assets.retrieve([{ id: mapping.assetId }]);
        }
        this.setState({
          selectedItem: {
            node,
            asset,
          },
        });
      } else if (navigateAway) {
        this.props.onRevisionClicked(modelId, revisionId);
        this.setState({
          selectedItem: undefined,
        });
      }
    }
  };

  onAddMappingClicked = async (_: number, assetId: number) => {
    const { modelId, revisionId, nodeId } = this.props;
    trackUsage('AssetPage.ThreeDSection.AddMapping', {
      nodeId,
      assetId,
      modelId,
      revisionId,
    });
    await this.props.createAssetNodeMapping(
      Number(modelId),
      Number(revisionId),
      Number(nodeId!),
      assetId
    );
    this.onNodeSelected(nodeId!);
  };

  onDeleteMapping = async () => {
    const { modelId, revisionId, nodeId } = this.props;
    const { selectedItem } = this.state;
    trackUsage('AssetPage.ThreeDSection.DeleteMapping', {
      nodeId,
      modelId,
      revisionId,
    });
    if (!canReadThreeD()) {
      return;
    }
    if (selectedItem && selectedItem.node && selectedItem.asset) {
      await sdk.assetMappings3D.delete(Number(modelId), Number(revisionId), [
        {
          nodeId: selectedItem.node.id,
          assetId: selectedItem.asset.id,
        },
      ]);
      await this.props.deleteAssetNodeMapping(
        Number(modelId),
        Number(revisionId),
        selectedItem.asset.id
      );
      this.onNodeSelected(nodeId!);
    }
  };

  onViewParent = async () => {
    trackUsage('AssetPage.ThreeDSection.ViewParent', {});
    const { selectedItem } = this.state;
    if (selectedItem && selectedItem.node && selectedItem.node.parentId) {
      this.onNodeSelected(selectedItem.node.parentId);
    } else {
      message.error('Unable to select parent');
    }
  };

  renderCard = () => {
    const { selectedItem } = this.state;
    const { modelId, revisionId, asset } = this.props;
    if (
      !asset ||
      !modelId ||
      !revisionId ||
      !selectedItem ||
      !this.props.nodeId
    ) {
      return null;
    }
    return (
      <ThreeDCard
        selectedItem={selectedItem!}
        rootId={asset.rootId}
        onClose={() =>
          this.setState({ selectedItem: undefined }, () =>
            this.props.onRevisionClicked(modelId, revisionId)
          )
        }
        showingAllUnderAsset={!this.props.nodeId}
        onDeleteMapping={this.onDeleteMapping}
        onAddMappingClicked={this.onAddMappingClicked}
        onViewParent={this.onViewParent}
        onViewAsset={() => this.props.onAssetClicked(selectedItem.asset!.id)}
      />
    );
  };

  render3D = () => {
    const { modelId, revisionId, selectedModel, nodeId, asset } = this.props;
    const { nodeIds } = this.state;
    if (selectedModel && modelId && revisionId) {
      return (
        <>
          <ViewingDetailsNavBar
            name={selectedModel.name || '3D Model'}
            onButtonClicked={() => {
              if (nodeId) {
                this.props.onNavigateToPage(
                  'threed',
                  ...[modelId, revisionId, 'node', nodeId]
                );
              } else if (asset) {
                this.props.onNavigateToPage(
                  'threed',
                  ...[modelId, revisionId, 'asset', asset.id]
                );
              } else {
                this.props.onNavigateToPage('threed', ...[modelId, revisionId]);
              }
            }}
            onBackClicked={this.props.onClearSelection}
          />
          <div style={{ flex: 1, position: 'relative' }}>
            <Model3D
              modelId={modelId!}
              revisionId={revisionId!}
              nodeIds={nodeIds}
              onAssetIdChange={(_, newNodeId) => this.onNodeSelected(newNodeId)}
              onNodeIdChange={this.onNodeSelected}
            />
            {this.renderCard()}
          </div>
        </>
      );
    }
    return (
      <>
        <ViewingDetailsNavBar
          name="3D Model"
          onButtonClicked={() => {}}
          onBackClicked={this.props.onClearSelection}
        />
        <div>
          <Placeholder text="Loading..." componentName="3D Model" />
        </div>
      </>
    );
  };

  render() {
    const {
      threed: { models, byAssetId, loading },
      modelId,
      revisionId,
      asset,
    } = this.props;
    if (modelId && revisionId) {
      return this.render3D();
    }
    return (
      <Wrapper>
        <VerticallyCenteredRow>
          <div className="left">
            <p />
          </div>
          <div className="right">
            <Button icon="plus" type="primary" disabled={!canReadThreeD(false)}>
              Create 3D Model
            </Button>
          </div>
        </VerticallyCenteredRow>
        <FlexTableWrapper>
          <Table
            dataSource={asset ? byAssetId[asset.rootId!] : undefined}
            loading={loading}
            pagination={false}
            rowKey="modelId"
            onRow={item => ({
              onClick: () => {
                this.props.onRevisionClicked(item.modelId, item.revisionId);
              },
            })}
            columns={[
              {
                title: '3D Model Names',
                key: 'name',
                render: item => {
                  const model = models[item.modelId];
                  if (model) {
                    return <span>{model.name}</span>;
                  }
                  return <span>Loading...</span>;
                },
              },
            ]}
          />
        </FlexTableWrapper>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState, origProps: OrigProps) => {
  return {
    threed: state.threed,
    selectedModel: origProps.modelId
      ? state.threed.models[origProps.modelId]
      : undefined,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      fetchModels,
      fetchMappingsFromAssetId,
      createAssetNodeMapping,
      deleteAssetNodeMapping,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(AssetThreeDSection);
