import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button } from 'antd';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import { AssetsState } from '../../modules/assets';
import { RootState } from '../../reducers/index';

const BackSection = styled.div`
  padding: 22px 26px;
`;

type OrigProps = {
  match: {
    params: {
      assetId: number;
      tenant: string;
    };
  };
};

type Props = {
  assets: AssetsState;
  push: typeof push;
} & OrigProps;

type State = {};

class AssetPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  onBackClicked = () => {
    this.props.push(`/${this.props.match.params.tenant}/search/assets`);
  };

  render() {
    return (
      <>
        <BackSection>
          <Button type="link" icon="arrow-left" onClick={this.onBackClicked}>
            Back to Search Result
          </Button>
        </BackSection>
        <h1>Asset</h1>
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    assets: state.assets,
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(AssetPage);
