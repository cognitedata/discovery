import React from 'react';
import { connect } from 'react-redux';
import { Modal, Button, message, Select, Spin, Input } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { Asset } from '@cognite/sdk';
import debounce from 'lodash/debounce';
import styled from 'styled-components';
import AceEditor from 'react-ace';
import { ExtendedAsset, editAsset, fetchAsset } from '../../modules/assets';
import { sdk } from '../../index';
import { RootState } from '../../reducers/index';
import { trackSearchUsage } from '../../utils/metrics';
import 'brace/theme/github';

import 'brace/mode/json';

const FormDetails = styled.div`
  p {
    margin-bottom: 6px;
    margin-top: 12px;
  }
`;

type Props = {
  assetId: number;
  rootAssetId: number;
  onClose: (e?: any) => void;
  editAsset: typeof editAsset;
  fetchAsset: typeof fetchAsset;
  assets: { [key: number]: ExtendedAsset };
};

type State = {
  selectedParent?: number;
  searchResults: Asset[];
  fetching: boolean;
  metadata?: string;
  description?: string;
  name?: string;
};

class EditAssetModal extends React.Component<Props, State> {
  generated?: string;

  source?: string;

  constructor(props: Props) {
    super(props);

    this.doSearch = debounce(this.doSearch, 100);

    const { assets, assetId } = props;
    const { parentId, name, description, metadata } = assets[assetId];
    if (parentId && !assets[parentId]) {
      this.props.fetchAsset(parentId);
    }

    if (metadata && metadata.COGNITE__GENERATED) {
      this.generated = metadata.COGNITE__GENERATED;
      this.source = metadata.COGNITE__SOURCE;
      delete metadata.COGNITE__GENERATED;
      delete metadata.COGNITE__SOURCE;
    }

    this.state = {
      searchResults: parentId && assets[parentId] ? [assets[parentId]] : [],
      fetching: false,
      selectedParent: props.assets[props.assetId].parentId,
      metadata: metadata ? JSON.stringify(metadata, null, 2) : undefined,
      description,
      name,
    };
  }

  componentDidUpdate(prevProps: Props) {
    const { assets, assetId } = this.props;
    const { parentId } = assets[assetId];
    if (parentId && assets[parentId] !== prevProps.assets[parentId]) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        searchResults: assets[parentId] ? [assets[parentId]] : [],
      });
    }
  }

  get isRoot() {
    const { assets, assetId } = this.props;
    const { id, rootId } = assets[assetId];
    return id === rootId;
  }

  doSearch = async (query: string) => {
    if (query.length > 0) {
      trackSearchUsage('EditAssetModal', 'Asset', { query });
      this.setState({ fetching: true });
      const results = await sdk.assets.search({
        search: { name: query },
        filter: {
          rootIds: [{ id: this.props.rootAssetId }],
        },
        limit: 1000,
      });
      this.setState({
        searchResults: results
          .slice(0, results.length)
          .filter(el => el.id !== this.props.assetId),
        fetching: false,
      });
    }
  };

  saveChanges = () => {
    const { selectedParent, name, description, metadata } = this.state;
    if ((this.isRoot || selectedParent) && name) {
      let metadataParsed;
      try {
        metadataParsed = metadata ? JSON.parse(metadata) : undefined;
      } catch (e) {
        message.error('Invalid metadata JSON');
        return;
      }
      this.props.editAsset({
        id: this.props.assetId,
        update: {
          // @ts-ignore
          ...(selectedParent && {
            parentId: {
              set: selectedParent,
            },
          }),
          name: {
            set: name,
          },
          ...(description && {
            description: {
              set: description,
            },
          }),
          ...((!description || description.length === 0) && {
            description: {
              setNull: true,
            },
          }),
          ...(metadata && {
            metadata: {
              set: {
                ...(this.source && { COGNITE__SOURCE: this.source }),
                ...(this.generated && { COGNITE__GENERATED: this.generated }),
                ...metadataParsed,
              },
            },
          }),
        },
      });
      message.info('Updating asset...');
      this.props.onClose();
    } else {
      message.info('A parent ID and name must be valid');
    }
  };

  render() {
    const { assets, assetId } = this.props;
    const {
      selectedParent,
      fetching,
      searchResults,
      name,
      description,
      metadata,
    } = this.state;
    const { parentId } = assets[assetId];
    return (
      <Modal
        visible
        title="Edit Asset"
        onCancel={this.props.onClose}
        footer={[
          <Button key="submit" type="primary" onClick={this.saveChanges}>
            Update Asset
          </Button>,
        ]}
      >
        <FormDetails>
          <p>
            Current Parent:{' '}
            {parentId && assets[parentId!] ? assets[parentId!].name : 'N/A'}
          </p>
          <Select
            showSearch
            style={{ width: '100%' }}
            placeholder="Select existing asset"
            value={selectedParent}
            notFoundContent={fetching ? <Spin size="small" /> : null}
            onChange={(id: any) =>
              this.setState({ selectedParent: Number(id) })
            }
            onSearch={this.doSearch}
            disabled={this.isRoot}
            filterOption={false}
          >
            {searchResults.map(asset => {
              return (
                <Select.Option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.id})
                </Select.Option>
              );
            })}
          </Select>
          <p>Name</p>
          <Input
            value={name}
            placeholder="Name"
            onChange={ev => this.setState({ name: ev.target.value })}
          />
          <p>Description</p>
          <Input
            value={description}
            placeholder="Description"
            onChange={ev => this.setState({ description: ev.target.value })}
          />
          <p>Metadata</p>
          <AceEditor
            mode="json"
            width="100%"
            theme="github"
            value={metadata}
            onChange={newValue => this.setState({ metadata: newValue })}
            editorProps={{ $blockScrolling: true }}
          />
        </FormDetails>
      </Modal>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return { assets: state.assets.all };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      editAsset,
      fetchAsset,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditAssetModal);
