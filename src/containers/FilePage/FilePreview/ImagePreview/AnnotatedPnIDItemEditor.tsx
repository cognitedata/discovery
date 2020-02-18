import React, { useState } from 'react';
import { Card, Input, Button, Tag } from 'antd';
import AssetSelect from 'components/AssetSelect';
import styled from 'styled-components';
import { useSelector } from '../../../../utils/ReduxUtils';
import { ProposedPnIDAnnotation } from './AnnotatedPnIDPreview';
import { PnIDAnnotation } from '../../../../utils/PnIDApi';

const WrappedCard = styled(Card)`
  && {
    width: 300px;
  }
  .button-row {
    margin-top: 12px;
    & > * {
      margin-left: 6px;
    }
    & > *:first-child() {
      margin-left: 0px;
    }
  }
`;

type Props = {
  annotation: ProposedPnIDAnnotation | PnIDAnnotation;
  editable: boolean;
  onUpdateDetection: (
    annotation: ProposedPnIDAnnotation | PnIDAnnotation
  ) => void;
  onDeleteDetection: () => void;
};

const AnnotatedPnIDItemEditor = ({
  annotation,
  editable,
  onUpdateDetection,
  onDeleteDetection,
}: Props) => {
  const assetsMap = useSelector(state => state.assets.items);
  const [label, setLabel] = useState(annotation ? annotation.label : '');
  const [assetIds, setAssetIds] = useState(
    annotation && annotation.assetId ? [annotation.assetId] : undefined
  );

  const [loading, setLoading] = useState(false);

  const isNewDetection = Number.isNaN(Number(annotation.id));

  if (editable) {
    return (
      <WrappedCard>
        <p>Label</p>
        <Input onChange={e => setLabel(e.target.value)} value={label} />
        <p>Asset</p>
        <AssetSelect
          selectedAssetIds={assetIds}
          style={{ width: '100%' }}
          onAssetSelected={(ids: number[]) => setAssetIds(ids)}
        />
        <div className="button-row">
          <Button
            type="primary"
            icon={isNewDetection ? 'plus' : 'edit'}
            loading={loading}
            onClick={async () => {
              setLoading(true);
              await onUpdateDetection({
                ...annotation,
                label,
                assetId: assetIds ? assetIds[0] : undefined,
              });
              setLoading(false);
            }}
          >
            {isNewDetection ? 'Add Detection' : 'Edit Detection'}
          </Button>
          <Button icon="delete" onClick={() => onDeleteDetection()} />
        </div>
      </WrappedCard>
    );
  }
  return (
    <WrappedCard>
      <h4>{label}</h4>

      {annotation.assetId && (
        <Tag key={annotation.assetId}>
          {assetsMap[annotation.assetId]
            ? assetsMap[annotation.assetId].name
            : 'Loading...'}
        </Tag>
      )}
    </WrappedCard>
  );
};

export default AnnotatedPnIDItemEditor;
