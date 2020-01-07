import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, message } from 'antd';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import Model3D from 'components/Model3D';
import { RootState } from '../../reducers/index';
import LoadingWrapper from '../../components/LoadingWrapper';
import { selectThreeD, ThreeDState } from '../../modules/threed';
import ThreeDSidebar from './ThreeDSidebar';

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

type State = {};

class ThreeDPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

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

  onBackClicked = () => {
    this.props.push(`/${this.props.match.params.tenant}/search/threed`);
  };

  onGoToAssetClicked = (id: number) => {
    this.props.push(`/${this.tenant}/asset/${id}`);
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
                nodeId={this.nodeId}
                onAssetIdChange={() => message.info('Coming soon')}
                onNodeIdChange={(id: number) =>
                  this.props.push(
                    `/${this.tenant}/threed/${modelId}/${revisionId}/${id}`
                  )
                }
              />
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
