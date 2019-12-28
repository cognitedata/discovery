import React, { Component } from 'react';
import { List, Icon, Button } from 'antd';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { selectThreeD, fetchModels, ThreeDState } from '../../modules/threed';
import { RootState } from '../../reducers/index';
import { selectAppState, setModelAndRevisionAndNode } from '../../modules/app';
import { trackUsage } from '../../utils/metrics';

type Props = {
  setModelAndRevisionAndNode: typeof setModelAndRevisionAndNode;
  fetchModels: typeof fetchModels;
  threed: ThreeDState;
  tenant: string;
};
class ModelList extends Component<Props, {}> {
  componentDidMount() {
    if (Object.values(this.props.threed.models).length === 0) {
      this.props.fetchModels();
    }
  }

  render() {
    const {
      threed: { models, loading },
    } = this.props;
    const items = Object.values(models).filter(
      model =>
        model.revisions && model.revisions.some(revison => revison.published)
    );
    return (
      <List
        header={`${items.length} model${items.length > 1 ? 's' : ''}`}
        itemLayout="horizontal"
        dataSource={items}
        loading={loading}
        locale={{
          emptyText: 'No models. Please upload a 3D model!',
        }}
        renderItem={item => {
          const revision = item.revisions!.filter(
            revison => revison.published
          )[0];
          return (
            <List.Item>
              <Button
                type="link"
                style={{
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
                onClick={() => {
                  this.props.setModelAndRevisionAndNode(item.id, revision.id);
                  trackUsage('ModelList.SelectModel', {
                    modelId: item.id,
                  });
                }}
              >
                <Icon type="code-sandbox" />
                {item.name}
              </Button>
            </List.Item>
          );
        }}
      />
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    threed: selectThreeD(state),
    tenant: selectAppState(state).tenant!,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      fetchModels,
      setModelAndRevisionAndNode,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(ModelList);
