import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, message } from 'antd';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import Model3D from 'components/Model3D';
import { Asset, RevealNode3D } from '@cognite/sdk';
import { deleteAssetNodeMapping } from 'modules/assetmappings';
import { sdk } from 'utils/SDK';
import { RootState } from '../../reducers/index';
import LoadingWrapper from '../../components/LoadingWrapper';
import {
  ThreeDState,
  updateRevisionRepresentAsset,
} from '../../modules/threed';
import ThreeDSidebar from './ThreeDSidebar';
import { ExtendedAsset } from '../../modules/assets';
import { createAssetNodeMapping } from '../../modules/assetmappings';
import ThreeDCard from './ThreeDCard';
import { canReadThreeD } from '../../utils/PermissionsUtils';
import { trackUsage } from '../../utils/Metrics';

const BackSection = styled.div`
  padding: 22px 26px;
  border-bottom: 1px solid #d9d9d9;
`;

const Wrapper = styled.div`
  display: flex;
  flex: 1;
  height: 0;
`;

const ThreeDView = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  position: relative;
  flex-direction: column;
`;

type OrigProps = {
  match: {
    params: {
      nodeId?: number;
      assetId?: number;
      modelId: number;
      revisionId: number;
      tenant: string;
    };
  };
};

type Props = {
  threed: ThreeDState;
  assets: (ExtendedAsset | undefined)[];
  assetIds: number[];
  push: typeof push;
  deleteAssetNodeMapping: typeof deleteAssetNodeMapping;
  updateRevisionRepresentAsset: typeof updateRevisionRepresentAsset;
  createAssetNodeMapping: typeof createAssetNodeMapping;
} & OrigProps;

type State = {
  nodeIds?: number[];
  selectedItem?: {
    asset?: Asset;
    node?: RevealNode3D;
  };
};

class ThreeDPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  async componentDidMount() {
    trackUsage('ThreeDPage.Load', {
      nodeId: this.props.match.params.nodeId,
      modelId: this.props.match.params.modelId,
      revisionId: this.props.match.params.revisionId,
      assetId: this.props.match.params.assetId,
    });
    this.setState({ nodeIds: await this.getNodeIds() });
    if (this.nodeId) {
      this.onNodeSelected(this.nodeId, false);
    } else if (this.assetId) {
      this.onAssetSelected(this.assetId, false);
    }
  }

  async componentDidUpdate(prevProps: Props) {
    const { assetId, nodeId } = this.props.match.params;
    if (prevProps.match.params.assetId !== assetId) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ nodeIds: await this.getNodeIds() });
      if (assetId) {
        this.onAssetSelected(Number(assetId), false);
      }
    } else if (nodeId !== prevProps.match.params.nodeId) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ nodeIds: await this.getNodeIds() });
      this.onNodeSelected(nodeId, false);
    }
  }

  getNodeIds = async () => {
    const { nodeId, revisionId, modelId, assetId } = this.props.match.params;
    if (!canReadThreeD(false)) {
      return [];
    }
    if (nodeId) {
      return [nodeId];
    }
    if (modelId && revisionId) {
      if (assetId) {
        const mappings = await sdk.assetMappings3D
          .list(modelId, revisionId, {
            assetId,
          })
          .autoPagingToArray({ limit: -1 });
        return mappings.map(el => el.nodeId);
      }
    }

    return undefined;
  };

  get tenant() {
    return this.props.match.params.tenant;
  }

  get modelAndRevision() {
    const model = this.props.threed.models[this.props.match.params.modelId];
    if (model && model.revisions) {
      const revision = model.revisions.find(
        el => el.id === Number(this.props.match.params.revisionId)
      );
      return {
        model,
        revision,
      };
    }
    return { model: undefined, revision: undefined };
  }

  get nodeId() {
    return this.props.match.params.nodeId;
  }

  get assetId() {
    return this.props.match.params.assetId;
  }

  get asset() {
    return this.props.match.params.nodeId;
  }

  onBackClicked = () => {
    this.props.push(`/${this.props.match.params.tenant}/search/threed`);
  };

  onGoToAssetClicked = (id: number) => {
    trackUsage('ThreeDPage.GoToAsset', { id });
    this.props.push(`/${this.tenant}/asset/${id}`);
  };

  onNodeSelected = async (nodeId?: number, navigateAway = true) => {
    trackUsage('ThreeDPage.NodeSelected', { nodeId, navigateAway });
    const { modelId, revisionId } = this.props.match.params;
    if (!canReadThreeD()) {
      return;
    }

    if (nodeId) {
      if (navigateAway) {
        this.props.push(
          `/${this.tenant}/threed/${modelId}/${revisionId}/node/${nodeId}`
        );
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
      this.props.push(`/${this.tenant}/threed/${modelId}/${revisionId}/`);
      this.setState({
        selectedItem: undefined,
      });
    }
  };

  onAssetSelected = async (assetId: number, navigateAway = true) => {
    trackUsage('ThreeDPage.AssetSelected', { assetId, navigateAway });
    const { modelId, revisionId } = this.props.match.params;
    if (!canReadThreeD()) {
      return;
    }
    if (navigateAway) {
      this.props.push(
        `/${this.tenant}/threed/${modelId}/${revisionId}/asset/${assetId}`
      );
    }
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
  };

  onViewParent = async () => {
    trackUsage('ThreeDPage.ViewParent', {});
    const { selectedItem } = this.state;
    if (selectedItem && selectedItem.node && selectedItem.node.parentId) {
      this.onNodeSelected(selectedItem.node.parentId);
    } else {
      message.error('Unable to select parent');
    }
  };

  onAddMappingClicked = async (rootId: number, assetId: number) => {
    const { modelId, revisionId, nodeId } = this.props.match.params;
    trackUsage('ThreeDPage.AddMapping', {
      nodeId,
      assetId,
      modelId,
      revisionId,
    });
    if (!rootId) {
      message.error('A root asset must first be selected!');
      return;
    }
    if (!this.props.assetIds.includes(rootId)) {
      await this.props.updateRevisionRepresentAsset(
        Number(modelId),
        Number(revisionId),
        Number(rootId!)
      );
    }
    await this.props.createAssetNodeMapping(
      Number(modelId),
      Number(revisionId),
      Number(nodeId!),
      assetId
    );
    this.onNodeSelected(nodeId!);
  };

  onDeleteMapping = async () => {
    const { modelId, revisionId, nodeId } = this.props.match.params;
    trackUsage('ThreeDPage.DeleteMapping', {
      nodeId,
      modelId,
      revisionId,
    });
    const { selectedItem } = this.state;
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

  renderCard = () => {
    const { selectedItem } = this.state;
    const { modelId, revisionId } = this.props.match.params;
    if (!selectedItem) {
      return null;
    }
    return (
      <ThreeDCard
        selectedItem={selectedItem!}
        rootId={this.props.assetIds[0]}
        onClose={() =>
          this.setState({ selectedItem: undefined }, () =>
            this.props.push(`/${this.tenant}/threed/${modelId}/${revisionId}/`)
          )
        }
        showingAllUnderAsset={!!this.assetId}
        onDeleteMapping={this.onDeleteMapping}
        onAddMappingClicked={this.onAddMappingClicked}
        onViewParent={this.onViewParent}
        onViewAllUnderAsset={this.onAssetSelected}
        onViewAsset={() =>
          this.props.push(
            `/${this.tenant}/asset/${
              selectedItem.asset!.id
            }/threed/${modelId}/${revisionId}`
          )
        }
      />
    );
  };

  render() {
    const { modelId, revisionId } = this.props.match.params;
    const { model, revision } = this.modelAndRevision;
    return (
      <>
        <BackSection>
          <Button type="link" icon="arrow-left" onClick={this.onBackClicked}>
            Back to Search Result
          </Button>
        </BackSection>
        {model && revision ? (
          <Wrapper>
            <ThreeDSidebar
              model={model}
              revisionId={revision.id}
              node={
                this.state.selectedItem
                  ? this.state.selectedItem.node
                  : undefined
              }
              onGoToAssetClicked={this.onGoToAssetClicked}
            />
            <ThreeDView>
              <Model3D
                modelId={modelId}
                revisionId={revisionId}
                nodeIds={this.state.nodeIds}
                onAssetIdChange={(_, nodeId) => this.onNodeSelected(nodeId)}
                onNodeIdChange={this.onNodeSelected}
              />
              {this.renderCard()}
            </ThreeDView>
          </Wrapper>
        ) : (
          <LoadingWrapper>
            <p>Loading 3D...</p>
          </LoadingWrapper>
        )}
      </>
    );
  }
}

const mapStateToProps = (state: RootState, origProps: OrigProps) => {
  const byAssetIds = Object.keys(state.threed.byAssetId)
    .filter(id => {
      const representations = state.threed.byAssetId[Number(id)];
      return (
        representations &&
        representations.some(
          representation =>
            representation.modelId === Number(origProps.match.params.modelId) &&
            representation.revisionId ===
              Number(origProps.match.params.revisionId)
        )
      );
    })
    .map(assetId => Number(assetId));
  return {
    assetIds: byAssetIds,
    threed: state.threed,
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      push,
      updateRevisionRepresentAsset,
      createAssetNodeMapping,
      deleteAssetNodeMapping,
    },
    dispatch
  );
export default connect(mapStateToProps, mapDispatchToProps)(ThreeDPage);
