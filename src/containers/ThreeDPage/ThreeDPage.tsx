import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button } from 'antd';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import Model3D from 'components/Model3D';
import { Asset, RevealNode3D } from '@cognite/sdk';
import BottomRightCard from 'components/BottomRightCard';
import { RootState } from '../../reducers/index';
import LoadingWrapper from '../../components/LoadingWrapper';
import { selectThreeD, ThreeDState } from '../../modules/threed';
import ThreeDSidebar from './ThreeDSidebar';
import { sdk } from '../../index';

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
  push: typeof push;
} & OrigProps;

type State = {
  nodeIds?: number[];
  selectedItem?: {
    asset?: Asset;
    node: RevealNode3D;
  };
};

class ThreeDPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  async componentDidMount() {
    this.setState({ nodeIds: await this.getNodeIds() });
    if (this.nodeId) {
      this.onNodeSelected(this.nodeId);
    }
  }

  async componentDidUpdate(prevProps: Props) {
    const { assetId, nodeId } = this.props.match.params;
    if (prevProps.match.params.assetId !== assetId) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ nodeIds: await this.getNodeIds() });
    } else if (nodeId !== prevProps.match.params.nodeId) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ nodeIds: await this.getNodeIds() });
    }
  }

  getNodeIds = async () => {
    const { nodeId, revisionId, modelId, assetId } = this.props.match.params;
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
    this.props.push(`/${this.tenant}/asset/${id}`);
  };

  onAssetSelected = async (assetId: number, nodeId: number) => {
    const { modelId, revisionId } = this.props.match.params;
    this.props.push(
      `/${this.tenant}/threed/${modelId}/${revisionId}/node/${nodeId}`
    );
    const [asset] = await sdk.assets.retrieve([{ id: assetId }]);
    const {
      items: [node],
    } = await sdk.viewer3D.listRevealNodes3D(modelId, revisionId, {
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
    const { modelId, revisionId } = this.props.match.params;
    this.props.push(
      `/${this.tenant}/threed/${modelId}/${revisionId}/node/${nodeId}`
    );
    const {
      items: [node],
    } = await sdk.viewer3D.listRevealNodes3D(modelId, revisionId, {
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
    const { modelId, revisionId } = this.props.match.params;
    if (!selectedItem) {
      return null;
    }

    if (this.nodeId) {
      return (
        <BottomRightCard
          title="Selected Node"
          onClose={() =>
            this.setState({ selectedItem: undefined }, () =>
              this.props.push(
                `/${this.tenant}/threed/${modelId}/${revisionId}/`
              )
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
                  onClick={() =>
                    this.props.push(
                      `/${this.tenant}/threed/${modelId}/${revisionId}/asset/${
                        selectedItem.asset!.id
                      }`
                    )
                  }
                >
                  View All Nodes Linked to Asset
                </Button>
                <br />
                <br />
                <Button
                  type="primary"
                  onClick={() =>
                    this.props.push(
                      `/${this.tenant}/asset/${
                        selectedItem.asset!.id
                      }/threed/${modelId}/${revisionId}/${selectedItem.node.id}`
                    )
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
            this.props.push(`/${this.tenant}/threed/${modelId}/${revisionId}/`)
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
                  this.props.push(
                    `/${this.tenant}/asset/${
                      selectedItem.asset!.id
                    }/threed/${modelId}/${revisionId}`
                  )
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
              onGoToAssetClicked={this.onGoToAssetClicked}
            />
            <ThreeDView>
              <Model3D
                modelId={modelId}
                revisionId={revisionId}
                nodeIds={this.state.nodeIds}
                onAssetIdChange={this.onAssetSelected}
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

const mapStateToProps = (state: RootState) => {
  return {
    threed: selectThreeD(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(ThreeDPage);
