import React from 'react';
import { connect } from 'react-redux';
import { Layout, Radio } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { Asset } from '@cognite/sdk';
import { selectAssets, AssetsState } from '../../modules/assets';
import {
  AppState,
  selectApp,
  setAssetId,
  resetAppState,
  setModelAndRevisionAndNode,
} from '../../modules/app';
import AssetSearchComponent from '../AssetSearchComponent';
import AssetPane from './AssetPane';
import ThreeDPane from './ThreeDPane';
import ModelList from './ModelList';
import { RootState } from '../../reducers/index';
import { selectThreeD, ThreeDState } from '../../modules/threed';

const { Sider } = Layout;

const RootSelector = styled(Radio.Group)`
  && {
    margin-top: 12px;
    margin-bottom: 0px;
    display: flex;
  }
  && > * {
    flex: 1;
  }
`;

type Props = {
  app: AppState;
  assets: AssetsState;
  threed: ThreeDState;
  setAssetId: typeof setAssetId;
  setModelAndRevisionAndNode: typeof setModelAndRevisionAndNode;
  resetAppState: typeof resetAppState;
};

type State = {
  selectedPane: string;
};

class Main extends React.Component<Props, State> {
  state = {
    selectedPane: 'asset',
  };

  render() {
    const {
      app: { rootAssetId, modelId, revisionId },
      assets: { all },
      threed: { models },
    } = this.props;

    let assetPane = null;
    let threeDPane = null;
    // Nothing selected
    if (!modelId && !rootAssetId) {
      const onboardingText = (
        <>
          <p style={{ marginTop: '16px', marginBottom: '16px' }}>
            Welcome to <strong>Discovery</strong>.
          </p>
          <p>
            Start by searching using the search bar above or choosing a root
            asset or 3D model via the tabs.
          </p>
        </>
      );
      assetPane = <>{onboardingText}</>;
      threeDPane = (
        <>
          {onboardingText}
          <ModelList />
        </>
      );
    } else if (rootAssetId) {
      assetPane = <AssetPane />;
      if (!modelId || !revisionId) {
        threeDPane = (
          <>
            <p>{`Need to map a 3D Model to ${all[rootAssetId].name} first.`}</p>
          </>
        );
      } else {
        threeDPane = <ThreeDPane />;
      }
    } else if (modelId) {
      assetPane = (
        <>
          <p>{`Need to map ${models[modelId].name} Model to a Root Asset first.`}</p>
        </>
      );
      threeDPane = <ThreeDPane />;
    }
    return (
      <Sider
        style={{
          overflow: 'auto',
          height: '100vh',
          padding: '12px',
          background: 'rgb(255,255,255)',
        }}
        width={350}
      >
        <AssetSearchComponent
          rootAsset={
            rootAssetId ? this.props.assets.all[rootAssetId] : undefined
          }
          onAssetClicked={(selectedAsset: Asset) =>
            this.props.setAssetId(selectedAsset.rootId, selectedAsset.id)
          }
        />
        <RootSelector
          onChange={el => this.setState({ selectedPane: el.target.value })}
          value={this.state.selectedPane}
        >
          <Radio.Button value="asset">Assets</Radio.Button>
          <Radio.Button value="3d">3D Models</Radio.Button>
        </RootSelector>
        {this.state.selectedPane === 'asset' ? assetPane : threeDPane}
      </Sider>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
    threed: selectThreeD(state),
    assets: selectAssets(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      setAssetId,
      setModelAndRevisionAndNode,
      resetAppState,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Main);
