import React from 'react';
import { connect } from 'react-redux';
import { List, Spin } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { RootState } from '../../reducers/index';
import { selectApp, AppState } from '../../modules/app';
import {
  fetchTypeForAsset,
  selectTypes,
  TypesState,
} from '../../modules/types';

type OrigProps = {};

type Props = {
  app: AppState;
  types: TypesState;
  fetchTypeForAsset: typeof fetchTypeForAsset;
} & OrigProps;

type State = {};

class EventsSection extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    if (this.props.app.assetId) {
      this.props.fetchTypeForAsset(this.props.app.assetId);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.app.assetId &&
      this.props.app.assetId !== prevProps.app.assetId
    ) {
      this.props.fetchTypeForAsset(this.props.app.assetId);
    }
  }

  render() {
    const {
      app: { assetId },
      types: { assetTypes, items },
    } = this.props;

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
    app: selectApp(state),
    types: selectTypes(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ fetchTypeForAsset }, dispatch);
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EventsSection);
