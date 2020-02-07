import React from 'react';
import { BetaTag } from '../../components/BetaWarning';
import TypeSelect from '../../components/TypeSelect/TypeSelect';
import { useDispatch, useSelector } from '../../utils/ReduxUtils';
import { updateAssetFilter } from '../../modules/search';

const SearchBarTypingFilters = ({
  disabled = false,
}: {
  disabled?: boolean;
}) => {
  const assetFilter = useSelector(state => state.search.assetFilter);
  const types = useSelector(state => state.types.items);
  const dispatch = useDispatch();

  const onTypeSelected = (ids: number[]) => {
    const selectedTypes = ids
      .map(id => types[id])
      .filter(type => !!type)
      .map(type => {
        return {
          type: { id: type.id, version: type.version },
        };
      });

    dispatch(
      updateAssetFilter({
        ...assetFilter,
        extendedFilter: {
          ...assetFilter.extendedFilter,
          types: selectedTypes,
        },
      })
    );
  };

  const selectedIds =
    assetFilter &&
    assetFilter.extendedFilter &&
    assetFilter.extendedFilter.types
      ? assetFilter.extendedFilter.types.map(el => el.type.id)
      : [];

  return (
    <>
      <p>
        Search by Types <BetaTag />
      </p>
      <TypeSelect
        multiple
        disabled={disabled}
        style={{ width: '100%' }}
        selectedTypeIds={selectedIds}
        onTypeSelected={onTypeSelected}
      />
    </>
  );
};
export default SearchBarTypingFilters;
