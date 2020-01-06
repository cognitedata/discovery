import React, { Component } from 'react';
import { Table, Button } from 'antd';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import Placeholder from 'components/Placeholder';
import VerticallyCenteredRow from 'components/VerticallyCenteredRow';
import styled from 'styled-components';
import {
  selectThreeD,
  fetchModels,
  ThreeDState,
  ThreeDModel,
} from '../modules/threed';
import { RootState } from '../reducers/index';
import { fetchMappingsFromAssetId } from '../modules/assetmappings';
import Model3D from '../components/Model3D';
import { ExtendedAsset } from '../modules/assets';
import ViewingDetailsNavBar from './AssetPage/ViewingDetailsNavBar';
import FlexTableWrapper from '../components/FlexTableWrapper';

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
  asset: ExtendedAsset;
  modelId?: number;
  revisionId?: number;
  nodeId?: number;
  onAssetClicked: (id: number) => void;
  onNodeClicked: (modelId: number, revisionId: number, nodeId: number) => void;
  onRevisionClicked: (modelId: number, revisionId: number) => void;
  onClearSelection: () => void;
  onViewDetails: (type: string, ...ids: number[]) => void;
};

type Props = {
  fetchMappingsFromAssetId: typeof fetchMappingsFromAssetId;
  fetchModels: typeof fetchModels;
  threed: ThreeDState;
  selectedModel: ThreeDModel | undefined;
} & OrigProps;

type State = {};
class ThreeDViewerComponent extends Component<Props, State> {
  cache = {};

  componentDidMount() {
    const { asset } = this.props;
    if (asset.id) {
      this.getNodeId(true);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { asset } = this.props;
    if (prevProps.asset.id !== asset.id) {
      this.getNodeId(true);
    }
  }

  getNodeId = (fetchIfMissing: boolean) => {
    const { representsAsset } = this.props.threed;
    const { nodeId, revisionId, modelId, asset } = this.props;
    if (nodeId) {
      return nodeId;
    }

    if (asset.id && fetchIfMissing) {
      if (modelId && revisionId) {
        this.props.fetchMappingsFromAssetId(modelId, revisionId, asset.id);
      } else if (asset.rootId && representsAsset[asset.rootId]) {
        representsAsset[asset.rootId].map(el =>
          this.props.fetchMappingsFromAssetId(
            el.modelId,
            el.revisionId,
            asset.id
          )
        );
      }
    }

    return undefined;
  };

  render3D = () => {
    const {
      nodeId: propNodeId,
      modelId,
      revisionId,
      asset,
      selectedModel,
    } = this.props;
    const nodeId = propNodeId || this.getNodeId(false);
    if (selectedModel && modelId && revisionId) {
      return (
        <>
          <ViewingDetailsNavBar
            name={selectedModel.name || '3D Model'}
            onButtonClicked={() =>
              this.props.onViewDetails(
                'threed',
                ...[modelId, revisionId, ...(nodeId ? [nodeId] : [])]
              )
            }
            onBackClicked={this.props.onClearSelection}
          />
          <div style={{ flex: 1, position: 'relative' }}>
            <Model3D
              assetId={asset.id!}
              modelId={modelId!}
              revisionId={revisionId!}
              nodeId={nodeId}
              onAssetIdChange={(id: number) => this.props.onAssetClicked(id)}
              onNodeIdChange={(id: number) =>
                this.props.onNodeClicked(modelId!, revisionId!, id)
              }
              cache={this.cache}
            />
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
            dataSource={representsAsset[asset.rootId!]}
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

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ThreeDViewerComponent);
