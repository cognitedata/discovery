import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Pagination, Spin, Table } from 'antd';
import { FilesMetadata } from '@cognite/sdk';
import moment from 'moment';
import { selectThreeD, setRevisionRepresentAsset } from '../../modules/threed';
import {
  selectAssets,
  AssetsState,
  createNewAsset,
  fetchAssets,
} from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { selectApp, AppState } from '../../modules/app';

type OrigProps = {};

type Props = {
  app: AppState;
  assets: AssetsState;
  onClickDocument: (file: FilesMetadata, index: number) => void;
  current: number;
  setPage: (page: number) => void;
  fetching: boolean;
  searchResults: FilesMetadata[];
} & OrigProps;

type State = {};

class FileExplorerComponent extends React.Component<Props, State> {
  readonly state: Readonly<State> = {};

  get pagination() {
    const { searchResults, current } = this.props;
    return (
      <Pagination
        current={current + 1}
        pageSize={20}
        onChange={index => this.props.setPage(index - 1)}
        total={searchResults.length}
      />
    );
  }

  render() {
    const { searchResults, fetching, current } = this.props;
    const { all: assets } = this.props.assets;
    if (fetching) {
      return <Spin />;
    }
    return (
      <>
        <div className="results">
          <Table
            dataSource={searchResults.slice(current * 20, current * 20 + 20)}
            pagination={false}
            rowKey="id"
            onRow={(item, i) => ({
              onClick: () => this.props.onClickDocument(item, i),
            })}
            columns={[
              {
                title: 'Name',
                key: 'name',
                dataIndex: 'name',
                render: (name: string) => (
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      wordBreak: 'unset',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      maxWidth: '600px',
                    }}
                  >
                    {name}
                  </span>
                ),
              },
              { title: 'Type', key: 'type', dataIndex: 'mimeType' },
              {
                title: 'Created Time',
                key: 'ctime',
                render: item => (
                  <span>{moment(item.createdTime).format('DD/MM/YYYY')}</span>
                ),
              },
              {
                title: 'Linked Assets',
                key: 'asset',
                width: '400px',
                render: (item: FilesMetadata) => (
                  <span>
                    {item.assetIds
                      ? item.assetIds
                          .slice(0, 10)
                          .map((el: number) =>
                            assets[el] ? assets[el].name : el
                          )
                          .join(', ') + (item.assetIds.length > 0 ? '...' : '')
                      : 'N/A'}
                  </span>
                ),
              },
            ]}
          />
        </div>
        {this.pagination}
      </>
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
      createNewAsset,
      fetchAssets,
      setRevisionRepresentAsset,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FileExplorerComponent);
