import React from 'react';
import { connect } from 'react-redux';
import { List, Spin } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { RootState } from '../../reducers/index';
import { selectAppState, AppState } from '../../modules/app';
import {
  fetchTypeForAssets,
  selectTypesState,
  TypesState,
} from '../../modules/types';

type OrigProps = {};

type Props = {
  app: AppState;
  types: TypesState;
  fetchTypeForAssets: typeof fetchTypeForAssets;
} & OrigProps;

type State = {};

class EventsSection extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    const { assetId } = this.props.app;
    if (assetId && !this.props.types.assetTypes[assetId]) {
      this.props.fetchTypeForAssets([assetId]);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { assetId } = this.props.app;
    if (
      assetId &&
      assetId !== prevProps.app.assetId &&
      !this.props.types.assetTypes[assetId]
    ) {
      this.props.fetchTypeForAssets([assetId]);
    }
  }

  render() {
    const {
      app: { assetId },
      types: { assetTypes, items, error },
    } = this.props;

    if (error) {
      return <p>Opps, we were not able to fetch typing information.</p>;
    }

    if (!assetId || !assetTypes[assetId]) {
      return <Spin />;
    }

    return (
      <>
        <List
          dataSource={assetTypes[assetId]}
          renderItem={(item: any) => {
            const typeSchema = items[item.type.id];
            return (
              <>
                <List.Item.Meta
                  title={`Name: ${typeSchema ? typeSchema.name : 'Loading...'}`}
                  description={
                    typeSchema ? typeSchema.description : 'Loading...'
                  }
                />
                <pre>{JSON.stringify(item.object, null, 2)}</pre>
              </>
            );
          }}
        />
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    asset: selectAppState(state),
    app: selectAppState(state),
    types: selectTypesState(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ fetchTypeForAssets }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(EventsSection);
