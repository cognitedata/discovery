import React from 'react';
import { connect } from 'react-redux';
import { Modal, Button, message, Select, Spin, Input } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { Asset, GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import debounce from 'lodash/debounce';
import styled from 'styled-components';
import AceEditor from 'react-ace';
import { ExtendedAsset, fetchAsset } from '../../modules/assets';
import { sdk } from '../../index';
import { RootState } from '../../reducers/index';
import { trackSearchUsage } from '../../utils/metrics';
import 'brace/theme/github';

import 'brace/mode/json';
import { selectTimeseries, editTimeseries } from '../../modules/timeseries';

const FormDetails = styled.div`
  p {
    margin-bottom: 6px;
    margin-top: 12px;
  }
`;

type OwnProps = {
  timeseriesId: number;
  onClose: (e?: any) => void;
};

type Props = {
  fetchAsset: typeof fetchAsset;
  assets: { [key: number]: ExtendedAsset };
  timeseries: GetTimeSeriesMetadataDTO;
  editTimeseries: typeof editTimeseries;
} & OwnProps;

type State = {
  selectedAssetId?: number;
  searchResults: Asset[];
  fetching: boolean;
  metadata?: string;
  description?: string;
  unit?: string;
  name?: string;
};

class EditTimeseriesModal extends React.Component<Props, State> {
  source?: string;

  constructor(props: Props) {
    super(props);

    this.doSearch = debounce(this.doSearch, 700);

    const { timeseries, assets } = props;
    const { unit, name, description, metadata, assetId } = timeseries;

    if (metadata && metadata.COGNITE__SOURCE) {
      this.source = metadata.COGNITE__SOURCE;
      delete metadata.COGNITE__SOURCE;
    }

    this.state = {
      searchResults: assetId && assets[assetId] ? [assets[assetId]] : [],
      fetching: false,
      selectedAssetId: assetId,
      metadata: metadata ? JSON.stringify(metadata, null, 2) : undefined,
      description,
      unit,
      name,
    };
  }

  componentDidUpdate(prevProps: Props) {
    const { timeseries, assets } = this.props;
    const { assetId } = timeseries;
    if (assetId && assets[assetId] !== prevProps.assets[assetId]) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        searchResults: assets[assetId] ? [assets[assetId]] : [],
      });
    }
  }

  doSearch = async (query: string) => {
    if (query.length > 0) {
      trackSearchUsage('EditTimeseriesModal', 'Asset', { query });
      this.setState({ fetching: true });
      const results = await sdk.assets.search({
        search: { name: query },
        limit: 1000,
      });
      this.setState({
        searchResults: results.slice(0, results.length),
        fetching: false,
      });
    }
  };

  saveChanges = () => {
    const { selectedAssetId, name, description, metadata, unit } = this.state;
    if (name) {
      let metadataParsed;
      try {
        metadataParsed = metadata ? JSON.parse(metadata) : undefined;
      } catch (e) {
        message.error('Invalid metadata JSON');
        return;
      }
      this.props.editTimeseries(this.props.timeseriesId, {
        id: this.props.timeseriesId,
        update: {
          ...(selectedAssetId && {
            assetId: {
              set: selectedAssetId,
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
          ...(unit && {
            unit: {
              set: unit,
            },
          }),
          ...((!unit || unit.length === 0) && {
            unit: {
              setNull: true,
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
                ...metadataParsed,
              },
            },
          }),
        },
      });
      message.info('Updating timeseries...');
      this.props.onClose();
    } else {
      message.info('A name must be valid');
    }
  };

  render() {
    const { assets } = this.props;
    const {
      selectedAssetId,
      fetching,
      searchResults,
      name,
      description,
      unit,
      metadata,
    } = this.state;
    return (
      <Modal
        visible
        title="Edit Timeseries"
        onCancel={this.props.onClose}
        footer={[
          <Button key="submit" type="primary" onClick={this.saveChanges}>
            Update Timeseries
          </Button>,
        ]}
      >
        <FormDetails>
          <p>
            Linked Asset:{' '}
            {selectedAssetId && assets[selectedAssetId!]
              ? assets[selectedAssetId!].name
              : 'N/A'}
          </p>
          <Select
            showSearch
            style={{ width: '100%' }}
            placeholder="Select existing asset"
            value={selectedAssetId}
            notFoundContent={fetching ? <Spin size="small" /> : null}
            onChange={(id: any) =>
              this.setState({ selectedAssetId: Number(id) })
            }
            onSearch={this.doSearch}
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
          <p>Unit</p>
          <Input
            value={unit}
            placeholder="Unit"
            onChange={ev => this.setState({ unit: ev.target.value })}
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

const mapStateToProps = (state: RootState, ownProps: OwnProps) => {
  return {
    assets: state.assets.all,
    timeseries: selectTimeseries(state).timeseriesData[ownProps.timeseriesId],
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      fetchAsset,
      editTimeseries,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditTimeseriesModal);
