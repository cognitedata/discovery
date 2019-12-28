import React, { Component } from 'react';
import { Button, Table } from 'antd';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { selectThreeD, fetchModels, ThreeDState } from '../modules/threed';
import { RootState } from '../reducers/index';
import {
  selectAppState,
  setModelAndRevisionAndNode,
  AppState,
  setAssetId,
} from '../modules/app';
import { fetchMappingsFromAssetId } from '../modules/assetmappings';
import Placeholder from '../components/Placeholder';
import Model3D from '../components/Model3D';

const Wrapper = styled.div`
  height: 100%;
  display: flex;
  width: 100%;
  flex-direction: column;

  .back {
    margin-bottom: 6px;
  }
`;

type Props = {
  setModelAndRevisionAndNode: typeof setModelAndRevisionAndNode;
  setAssetId: typeof setAssetId;
  fetchMappingsFromAssetId: typeof fetchMappingsFromAssetId;
  fetchModels: typeof fetchModels;
  threed: ThreeDState;
  app: AppState;
};

type State = {};
class ThreeDViewerComponent extends Component<Props, State> {
  cache = {};

  componentDidMount() {
    const {
      app: { assetId },
    } = this.props;
    if (assetId) {
      this.getNodeId(true);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { rootAssetId, assetId } = this.props.app;
    const { representsAsset } = this.props.threed;
    if (assetId && prevProps.app.assetId !== assetId) {
      this.getNodeId(true);
    }
    if (
      rootAssetId &&
      representsAsset[rootAssetId] &&
      prevProps.threed.representsAsset[rootAssetId] !==
        representsAsset[rootAssetId]
    ) {
      this.getNodeId(true);
    }
  }

  getNodeId = (fetchIfMissing: boolean) => {
    const {
      modelId,
      revisionId,
      nodeId,
      assetId,
      rootAssetId,
    } = this.props.app;
    const { representsAsset } = this.props.threed;
    if (nodeId) {
      return nodeId;
    }

    if (assetId && fetchIfMissing) {
      if (modelId && revisionId) {
        this.props.fetchMappingsFromAssetId(modelId, revisionId, assetId);
      } else if (rootAssetId && representsAsset[rootAssetId]) {
        representsAsset[rootAssetId].map(el =>
          this.props.fetchMappingsFromAssetId(
            el.modelId,
            el.revisionId,
            assetId
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
      assetId,
      rootAssetId,
    } = this.props.app;
    const nodeId = propNodeId || this.getNodeId(false);
    return (
      <Model3D
        assetId={assetId!}
        modelId={modelId!}
        revisionId={revisionId!}
        nodeId={nodeId}
        onAssetIdChange={(id: number) =>
          this.props.setAssetId(rootAssetId!, id)
        }
        onNodeIdChange={(id: number) =>
          this.props.setModelAndRevisionAndNode(modelId!, revisionId!, id)
        }
        cache={this.cache}
      />
    );
  };

  render() {
    const {
      threed: { models, representsAsset, loading },
      app: { rootAssetId, modelId, revisionId },
    } = this.props;
    if (modelId && revisionId) {
      return (
        <Wrapper>
          {rootAssetId &&
            representsAsset[rootAssetId] &&
            representsAsset[rootAssetId].length !== 1 && (
              <div className="back">
                <Button
                  onClick={() => {
                    this.props.setModelAndRevisionAndNode();
                  }}
                >
                  Back
                </Button>
              </div>
            )}
          <div style={{ flex: 1 }}>{this.render3D()}</div>
        </Wrapper>
      );
    }
    if (loading) {
      return <Placeholder componentName="3D Viewer" text="Loading Models..." />;
    }
    if (!rootAssetId) {
      return (
        <Placeholder componentName="3D Viewer" text="No Root Asset Selected" />
      );
    }
    const mappedAssets = representsAsset[rootAssetId];
    if (!mappedAssets || mappedAssets.length === 0) {
      return (
        <Placeholder
          componentName="3D Viewer"
          text="No 3D Model Mapped to Asset"
        />
      );
    }
    return (
      <Table
        dataSource={representsAsset[rootAssetId!]}
        pagination={false}
        rowKey="modelId"
        onRow={item => ({
          onClick: () => {
            this.props.setModelAndRevisionAndNode(
              item.modelId,
              item.revisionId
            );
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
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    threed: selectThreeD(state),
    app: selectAppState(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      fetchModels,
      setAssetId,
      fetchMappingsFromAssetId,
      setModelAndRevisionAndNode,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ThreeDViewerComponent);
