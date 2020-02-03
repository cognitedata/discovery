import React from 'react';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import { RootState } from 'reducers';
import { MemoryRouter } from 'react-router-dom';
import * as PermissionsUtils from 'utils/PermissionsUtils';
import { configure, mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { Select, Popover } from 'antd';
import TypeSelect from './TypeSelect';

jest.mock('utils/PermissionsUtils');

configure({ adapter: new Adapter() });

const initialStoreState: Partial<RootState> = {
  types: {
    items: {
      '1729121837401342': {
        externalId: 'sample-type',
        name: "David's Type",
        description: 'testing for david',
        properties: [],
        id: 1729121837401342,
        version: 1,
        createdTime: '2019-11-22T03:14:43.029Z',
        lastUpdatedTime: '2019-11-22T03:14:43.029Z',
      },
      '4989650985264432': {
        externalId: 'real',
        name: 'Real',
        properties: [
          {
            propertyId: 'source',
            name: 'source',
            description: 'source of type',
            type: 'string',
          },
          {
            propertyId: 'timeseries1',
            name: 'time series 1',
            description: 'Time series reference',
            type: 'timeseriesRef',
          },
        ],
        parentType: {
          id: 1426226854338845,
          version: 3,
          externalId: 'number',
        },
        id: 4989650985264432,
        version: 2,
        createdTime: '2020-01-20T09:59:07.508Z',
        lastUpdatedTime: '2020-01-20T09:59:07.508Z',
      },
    },
    error: false,
    assetTypes: {},
  },
};

const store = configureStore([thunk])(initialStoreState);

afterEach(() => {
  jest.clearAllMocks();
});

it('can select option', () => {
  // Test first render and effect
  const mockFunction = jest.fn();
  const container = mount(
    <Provider store={store}>
      <MemoryRouter>
        <TypeSelect onTypeSelected={mockFunction} />
      </MemoryRouter>
    </Provider>
  );
  const wrapper = container.find(Select);

  // Test second render and effect
  expect(container.find('li[role="option"]').length).toBe(0);

  wrapper.simulate('click');
  const options = container.find('li[role="option"]');
  expect(options.length).toBe(2);

  expect(options.at(0).text()).toEqual("David's Type(1729121837401342)");

  options.at(0).simulate('click');
  expect(mockFunction).toBeCalled();
});

it('can select multiple option', () => {
  // Test first render and effect
  let selectedIds: number[] = [];
  const callback = (ids: number[]) => {
    selectedIds = ids;
  };
  const container = mount(
    <Provider store={store}>
      <MemoryRouter>
        <TypeSelect multiple onTypeSelected={callback} />
      </MemoryRouter>
    </Provider>
  );
  const wrapper = container.find(Select);

  // Test second render and effect
  wrapper.simulate('click');
  container
    .find('li[role="option"]')
    .at(0)
    .simulate('click');
  wrapper.simulate('click');
  container
    .find('li[role="option"]')
    .at(1)
    .simulate('click');
  expect(selectedIds.length).toEqual(2);
});

it('if typesAcl is missing', () => {
  // should be disabled
  jest.spyOn(PermissionsUtils, 'canReadTypes').mockReturnValue(false);
  // Test first render and effect
  const mockFunction = jest.fn();
  const container = mount(
    <Provider store={store}>
      <MemoryRouter>
        <TypeSelect onTypeSelected={mockFunction} />
      </MemoryRouter>
    </Provider>
  );
  const wrapper = container.find(Select);

  // Test second render and effect
  wrapper.simulate('click');
  const options = container.find(Popover);
  expect(options.text()).toBeDefined();
});

it('if disabled', () => {
  jest.spyOn(PermissionsUtils, 'canReadTypes').mockReturnValue(true);
  // Test first render and effect
  const mockFunction = jest.fn();
  const container = mount(
    <Provider store={store}>
      <MemoryRouter>
        <TypeSelect disabled onTypeSelected={mockFunction} />
      </MemoryRouter>
    </Provider>
  );
  expect(container.find(Popover).exists()).toEqual(false);
  expect(container.find('li[role="option"]').exists()).toEqual(false);
});
