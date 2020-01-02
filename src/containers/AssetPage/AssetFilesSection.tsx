import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import { Button } from 'antd';
import { FilesMetadata } from '@cognite/sdk';
import Table, { ColumnProps } from 'antd/lib/table';
import moment from 'moment';
import VerticallyCenteredRow from 'components/VerticallyCenteredRow';
import FlexTableWrapper from 'components/FlexTableWrapper';
import { ExtendedAsset } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { fetchFiles, selectFilesForAsset } from '../../modules/files';

const Wrapper = styled.div`
  height: 100%;
  padding: 24px 56px;

  h1 {
    margin-top: 12px;
    margin-bottom: 0px;
  }
`;

type OrigProps = {
  asset: ExtendedAsset;
};

type Props = {
  files: FilesMetadata[] | undefined;
  push: typeof push;
  fetchFiles: typeof fetchFiles;
} & OrigProps;

type State = {};

class AssetFileSection extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    this.props.fetchFiles(this.props.asset.id);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.asset.id !== prevProps.asset.id) {
      this.props.fetchFiles(this.props.asset.id);
    }
  }

  get columns(): ColumnProps<FilesMetadata>[] {
    return [
      {
        title: 'Name',
        key: 'name',
        dataIndex: 'name',
      },
      {
        title: 'Description',
        key: 'description',
        dataIndex: 'description',
      },
      {
        title: 'Last Modified',
        key: 'last-modified',
        render: item => {
          return moment(item.updatedTime).format('YYYY-MM-DD hh:mm');
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        render: item => {
          return (
            <>
              <Button
                onClick={() => this.onUnlinkClicked(item.id)}
                ghost
                type="danger"
              >
                Unlink
              </Button>
            </>
          );
        },
      },
    ];
  }

  onUnlinkClicked = (fileId: number) => {
    console.log(fileId);
  };

  render() {
    const { files } = this.props;
    return (
      <Wrapper>
        <VerticallyCenteredRow>
          <div className="left">
            <p />
          </div>
          <div className="right">
            <Button icon="plus" type="primary">
              Upload New File
            </Button>
          </div>
        </VerticallyCenteredRow>
        <FlexTableWrapper>
          <Table dataSource={files} columns={this.columns} />
        </FlexTableWrapper>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState, origProps: OrigProps) => {
  return { files: selectFilesForAsset(state, origProps.asset.id) };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push, fetchFiles }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(AssetFileSection);
