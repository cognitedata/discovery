import React from 'react';
import { connect } from 'react-redux';
import { Tag } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { RootState } from '../reducers/index';
import { selectAppState } from '../modules/app';
import { BetaBadge } from '../components/BetaWarning';
import {
  fetchTypeForAssets,
  selectTypesState,
  TypesState,
} from '../modules/types';

type OrigProps = { assetId: number };

type Props = {
  types: TypesState;
  fetchTypeForAssets: typeof fetchTypeForAssets;
} & OrigProps;

type State = {};

class TypeBadge extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    const { assetId } = this.props;
    if (assetId && !this.props.types.assetTypes[assetId]) {
      this.props.fetchTypeForAssets([assetId]);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { assetId } = this.props;
    if (
      assetId &&
      assetId !== prevProps.assetId &&
      !this.props.types.assetTypes[assetId]
    ) {
      this.props.fetchTypeForAssets([assetId]);
    }
  }

  render() {
    const {
      assetId,
      types: { assetTypes, items },
    } = this.props;

    if (assetId && assetTypes[assetId] && assetTypes[assetId].length > 0) {
      return (
        <p>
          <BetaBadge>Type</BetaBadge>
          {assetTypes[assetId].map(el => {
            if (items[el.type.id]) {
              return <Tag key={el.type.id}>{items[el.type.id].name}</Tag>;
            }
            return <Tag key={el.type.id}>Loading</Tag>;
          })}
        </p>
      );
    }
    return null;
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    asset: selectAppState(state),
    types: selectTypesState(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ fetchTypeForAssets }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(TypeBadge);
