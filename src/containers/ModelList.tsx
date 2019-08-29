import React from 'react';
import { List, Icon } from 'antd';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { selectThreeD, fetchModels, ThreeDState } from '../modules/threed';
import { RootState } from '../reducers/index';

function ModelList({
  threed,
  tenant,
}: {
  threed: ThreeDState;
  tenant: string;
}) {
  const { models, loading } = threed;
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
            <Link to={`/${tenant}/models/${item.id}/${revision.id}`}>
              <Icon type="code-sandbox" />
              {item.name}
            </Link>
          </List.Item>
        );
      }}
    />
  );
}

const mapStateToProps = (state: RootState) => {
  return {
    threed: selectThreeD(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doFetchModels: fetchModels,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ModelList);
