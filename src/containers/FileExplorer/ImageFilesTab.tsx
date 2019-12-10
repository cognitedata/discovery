import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Spin, Pagination } from 'antd';
import { FilesMetadata } from '@cognite/sdk';
import styled from 'styled-components';
import moment from 'moment';
import { RootState } from '../../reducers/index';
import { selectApp, AppState } from '../../modules/app';
import { sdk } from '../../index';

const Images = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  flex-wrap: wrap;
  overflow: auto;
  margin: -12px;
  margin-bottom: 12px;

  && > .item {
    margin: 12px;
    padding: 6px;
    background: #fff;
    flex: 1 250px;
    transition: 0.3s all;
  }

  && > .item:hover {
    background: #dfdfdf;
  }

  && > .item img {
    width: 100%;
    height: auto;
  }

  && > .item .image {
    width: 100%;
    height: 200px;
    margin-bottom: 12px;
    overflow: hidden;
    background-size: cover;
    background-position: center;
  }
  && > .item p {
    margin-bottom: 0;
  }
`;

type OrigProps = {};

type Props = {
  app: AppState;
  onClickDocument: (file: FilesMetadata, index: number) => void;
  searchResults: FilesMetadata[];
  current: number;
  setPage: (page: number) => void;
  fetching: boolean;
} & OrigProps;

type State = {
  imageUrls: { [id: number]: string | false };
};

class ImageFilesTab extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    imageUrls: {},
  };

  componentDidMount() {
    this.fetchImageUrls();
  }

  componentDidUpdate(prevProps: Props) {
    if (
      prevProps.current !== this.props.current ||
      (this.props.searchResults.length > 0 &&
        prevProps.searchResults.length !== this.props.searchResults.length)
    ) {
      this.fetchImageUrls();
    }
  }

  componentWillUnmount() {
    const { imageUrls } = this.state;
    Object.keys(imageUrls).forEach((key: string) => {
      const val = imageUrls[Number(key)];
      if (val) {
        URL.revokeObjectURL(val);
      }
    });
  }

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

  fetchImageUrls = async () => {
    const { imageUrls } = this.state;
    const { searchResults, current } = this.props;

    searchResults
      .slice(current * 20, current * 20 + 20)
      .forEach(async result => {
        try {
          if (imageUrls[result.id]) {
            return;
          }
          const response = await sdk.get(
            `/api/playground/projects/${sdk.project}/files/icon?id=${result.id}`,
            {
              responseType: 'arraybuffer',
              headers: {
                Accept: '*/*',
              },
            }
          );
          if (response.status === 200) {
            const arrayBufferView = new Uint8Array(response.data);
            const blob = new Blob([arrayBufferView], {
              type: response.headers['content-type'],
            });
            this.setState(state => ({
              ...state,
              imageUrls: {
                ...state.imageUrls,
                [result.id]: URL.createObjectURL(blob),
              },
            }));
          } else {
            throw new Error('Unable to load file');
          }
        } catch (e) {
          this.setState(state => ({
            ...state,
            imageUrls: {
              ...state.imageUrls,
              [result.id]: false,
            },
          }));
        }
      });
  };

  render() {
    const { imageUrls } = this.state;
    const { searchResults, current, fetching } = this.props;
    if (fetching) {
      return <Spin />;
    }
    return (
      <>
        <Images>
          {searchResults
            .slice(current * 20, current * 20 + 20)
            .map((image, i) => {
              let imagePlaceholder;
              if (imageUrls[image.id] === undefined) {
                imagePlaceholder = <Spin />;
              } else if (imageUrls[image.id] === false) {
                imagePlaceholder = <p>Unable to load image.</p>;
              }
              return (
                <div
                  className="item"
                  key={image.id}
                  role="button"
                  tabIndex={i}
                  onKeyDown={() => this.props.onClickDocument(image, i)}
                  onClick={() => this.props.onClickDocument(image, i)}
                >
                  <div
                    className="image"
                    style={{ backgroundImage: `url(${imageUrls[image.id]})` }}
                  >
                    {imagePlaceholder}
                  </div>
                  <p>{image.name}</p>
                  <p>
                    Created At: {moment(image.createdTime).format('DD/MM/YYYY')}
                  </p>
                </div>
              );
            })}
        </Images>
        {this.pagination}
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(ImageFilesTab);
