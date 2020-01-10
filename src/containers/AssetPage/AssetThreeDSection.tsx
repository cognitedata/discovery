import React, { Component } from 'react';
import { Table, Button } from 'antd';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import Placeholder from 'components/Placeholder';
import VerticallyCenteredRow from 'components/VerticallyCenteredRow';
import styled from 'styled-components';
import BottomRightCard from 'components/BottomRightCard';
import { Asset, RevealNode3D } from '@cognite/sdk';
import {
  selectThreeD,
  fetchModels,
  ThreeDState,
  ThreeDModel,
} from '../../modules/threed';
import { RootState } from '../../reducers/index';
import { fetchMappingsFromAssetId } from '../../modules/assetmappings';
import Model3D from '../../components/Model3D';
import { ExtendedAsset } from '../../modules/assets';
import ViewingDetailsNavBar from '../../components/ViewingDetailsNavBar';
import FlexTableWrapper from '../../components/FlexTableWrapper';
import { sdk } from '../../index';

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
  fetchModels: typeof fetchModels;
  threed: ThreeDState;
  selectedModel: ThreeDModel | undefined;
} & OrigProps;

type State = {
  nodeIds?: number[];
  selectedItem?: {
    asset?: Asset;
    node: RevealNode3D;
  };
};
class AssetThreeDSection extends Component<Props, State> {
  cache = {};

  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  async componentDidMount() {
    this.setState({ nodeIds: await this.getNodeIds() });
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
    } else if (nodeId !== prevProps.nodeId) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        nodeIds: await this.getNodeIds(),
        selectedItem: undefined,
      });
    }
  }

  getNodeIds = async () => {
    const { nodeId, revisionId, modelId, asset } = this.props;
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

  onAssetSelected = async (assetId: number, nodeId: number) => {
    const { modelId, revisionId } = this.props;
    this.props.onNodeClicked(modelId!, revisionId!, nodeId);
    const [asset] = await sdk.assets.retrieve([{ id: assetId }]);
    const {
      items: [node],
    } = await sdk.viewer3D.listRevealNodes3D(modelId!, revisionId!, {
      nodeId,
      depth: 0,
    });
    this.setState({
      selectedItem: {
        asset,
        node,
      },
    });
  };

  onNodeSelected = async (nodeId: number) => {
    const { modelId, revisionId } = this.props;
    this.props.onNodeClicked(modelId!, revisionId!, nodeId);
    const {
      items: [node],
    } = await sdk.viewer3D.listRevealNodes3D(modelId!, revisionId!, {
      nodeId,
      depth: 0,
    });
    this.setState({
      selectedItem: {
        node,
      },
    });
  };

  renderCard = () => {
    const { selectedItem } = this.state;
    const { modelId, revisionId } = this.props;
    if (!selectedItem) {
      return null;
    }

    if (this.props.nodeId) {
      return (
        <BottomRightCard
          title="Selected Node"
          onClose={() =>
            this.setState({ selectedItem: undefined }, () =>
              this.props.onRevisionClicked(modelId!, revisionId!)
            )
          }
        >
          <>
            <p>{selectedItem.node.name}</p>
            {selectedItem.asset && (
              <>
                <p>Linked to:</p>
                <p>{selectedItem.asset.name}</p>
                <Button
                  type="primary"
                  onClick={() =>
                    this.props.onNavigateToPage('asset', selectedItem.asset!.id)
                  }
                >
                  View Asset
                </Button>
              </>
            )}
          </>
        </BottomRightCard>
      );
    }

    return (
      <BottomRightCard
        title="Selected Asset"
        onClose={() =>
          this.setState({ selectedItem: undefined }, () =>
            this.props.onRevisionClicked(modelId!, revisionId!)
          )
        }
      >
        <>
          {selectedItem.asset && (
            <>
              <p>{selectedItem.asset.name}</p>
              <Button
                type="primary"
                onClick={() =>
                  this.props.onNavigateToPage('asset', selectedItem.asset!.id)
                }
              >
                View Asset
              </Button>
            </>
          )}
        </>
      </BottomRightCard>
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
              onAssetIdChange={this.onAssetSelected}
              onNodeIdChange={this.onNodeSelected}
              cache={this.cache}
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
      threed: { models, representsAsset, loading },
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
            <Button icon="plus" type="primary">
              Create 3D Model
            </Button>
          </div>
        </VerticallyCenteredRow>
        <FlexTableWrapper>
          <Table
            dataSource={asset ? representsAsset[asset.rootId!] : undefined}
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
    threed: selectThreeD(state),
    selectedModel: origProps.modelId
      ? selectThreeD(state).models[origProps.modelId]
      : undefined,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      fetchModels,
      fetchMappingsFromAssetId,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(AssetThreeDSection);
