import React from 'react';
import { BetaTag } from '../../components/BetaWarning';
import { useDispatch, useSelector } from '../../utils/ReduxUtils';
import { updateAssetFilter } from '../../modules/search';
import DataSetSelect from '../../components/DataSetSelect/DataSetSelect';

const SearchBarDataSetFilter = ({
  disabled = false,
}: {
  disabled?: boolean;
}) => {
  const assetFilter = useSelector(state => state.search.assetFilter);
  const dispatch = useDispatch();

  const onDataSetSelected = (ids: number[]) => {
    dispatch(
      updateAssetFilter({
        ...assetFilter,
        extendedFilter: {
          ...assetFilter.extendedFilter,
          dataSetIds: ids.length > 0 ? ids : undefined,
        },
      })
    );
  };

  const selectedIds =
    (assetFilter &&
      assetFilter.extendedFilter &&
      assetFilter.extendedFilter.dataSetIds) ||
    [];

  return (
    <>
      <p>
        Search by Data Set <BetaTag />
      </p>
      <DataSetSelect
        multiple
        disabled={disabled}
        style={{ width: '100%' }}
        selectedDataSetIds={selectedIds}
        onDataSetSelected={onDataSetSelected}
      />
    </>
  );
};
export default SearchBarDataSetFilter;
