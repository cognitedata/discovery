import React from 'react';
import { connect } from 'react-redux';
import { Button, Icon } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import {
  Responsive,
  WidthProvider,
  Layout as GridLayout,
} from 'react-grid-layout';
import { fetchTypes } from '../../modules/types';
import {
  selectThreeD,
  ThreeDState,
  fetchRevisions,
  fetchModels,
} from '../../modules/threed';
import { AssetsState, ExtendedAsset } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import AssetCustomSectionView, {
  AssetViewerType,
  AssetViewerTypeMap,
} from './AssetCustomSectionView';
import { trackUsage } from '../../utils/Metrics';
import ComponentSelector from '../../components/ComponentSelector';

const LAYOUT_LOCAL_STORAGE = 'layout';

interface DiscoveryLayout extends GridLayout {
  viewType: AssetViewerType;
}

const ResponsiveReactGridLayout = WidthProvider(Responsive);

// 13FV1234 is useful asset
type LayoutProps = {
  editable: boolean;
};

const CustomGridLayout = styled(ResponsiveReactGridLayout)<LayoutProps>`
  position: relative;
  overflow: auto;

  .react-grid-item {
    padding: 12px;
    background: #fff;
  }

  .react-resizable-handle {
    z-index: 1001;
    display: ${props => (props.editable ? 'block' : 'none')};
  }
  &&&& > div > div {
    padding: 12px;
  }
`;

const DraggingView = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #ffffffdd;
  z-index: 1000;
  display: flex;
  flex-direction: row;

  && > div {
    text-align: center;
    align-self: center;
    margin: 0 auto;
  }
  && i.big svg {
    height: 36px;
    width: 36px;
    margin-bottom: 12px;
  }

  &&:hover {
    cursor: move;
  }
`;

const ButtonArea = styled.div`
  position: absolute;
  right: 24px;
  bottom: 24px;
  z-index: 1000;

  && > * {
    margin-left: 24px;
  }
`;

const DeleteButton = styled(Button)`
  && {
    position: absolute;
    right: -6px;
    top: -6px;
    z-index: 1001;
  }
`;

type Props = {
  asset?: ExtendedAsset;
  tenant: string;
  search: string | undefined;
  threed: ThreeDState;
  assets: AssetsState;
  onNavigateToPage: (type: string, ...ids: number[]) => void;
  doFetchRevisions: typeof fetchRevisions;
  fetchModels: typeof fetchModels;
};

type State = {
  editLayout: boolean;
  layout: DiscoveryLayout[];
};

class AssetCustomSection extends React.Component<Props, State> {
  gridRef = React.createRef<Responsive>();

  constructor(props: Props) {
    super(props);

    const layoutString = localStorage.getItem(LAYOUT_LOCAL_STORAGE);
    let layout: DiscoveryLayout[] = [];
    if (layoutString) {
      const parsed = JSON.parse(layoutString);
      if (parsed && parsed.length && parsed.length > 0) {
        layout = JSON.parse(layoutString).filter(
          (el: any) =>
            el.x !== undefined &&
            el.y !== undefined &&
            el.w !== undefined &&
            el.h !== undefined &&
            el.i !== undefined &&
            el.viewType !== undefined
        );
      }
      localStorage.removeItem(LAYOUT_LOCAL_STORAGE);
    }

    trackUsage('AssetPage.AssetCustomSection', {
      reinitializeLayout: layout.length === 0,
    });

    if (layout.length === 0) {
      layout = [
        {
          i: '0',
          x: 0,
          y: 0,
          w: 2,
          h: 18,
          viewType: 'none',
        },
        {
          i: '1',
          x: 2,
          y: 0,
          w: 2,
          h: 18,
          viewType: 'none',
        },
      ];
    }

    this.state = {
      editLayout: false,
      layout,
    };
  }

  componentDidMount() {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 200);
  }

  onAddComponent = () => {
    trackUsage('AssetPage.AssetCustomSection.ComponentedAdded');
    const i =
      this.state.layout.reduce((prev, el) => Math.max(Number(el.i), prev), 0) +
      1;
    this.setState(state => ({
      // Add a new item. It must have a unique key!
      layout: state.layout.concat([
        {
          static: false,
          isDraggable: true,
          isResizable: true,
          i: `${i}`,
          x: (state.layout.length * 2) % 4,
          y: Infinity, // puts it at the bottom
          w: 2,
          h: 8,
          viewType: 'none',
        },
      ]),
    }));
  };

  changeEdit = (edit = false) => {
    this.setState({
      editLayout: edit,
    });
  };

  onLayoutChange = (newLayout: DiscoveryLayout[]) => {
    const layout = newLayout.map(el => ({
      ...el,
      viewType: this.state.layout.find(it => it.i === el.i)!.viewType,
    }));
    this.setState({ layout });
    // Track usage where the size has changed.
    trackUsage('AssetPage.AssetCustomSection.LayoutSizeChange', {
      layoutChanged: newLayout.filter(el => {
        const orig = this.state.layout.find(it => it.i === el.i)!;
        return (
          orig.x !== el.x ||
          orig.y !== el.y ||
          orig.w !== el.w ||
          orig.h !== el.h
        );
      }),
    });
    localStorage.setItem(LAYOUT_LOCAL_STORAGE, JSON.stringify(layout));

    // Fix weird layout issue
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 200);
    return true;
  };

  changeLayoutType = (type: AssetViewerType, index: string) => {
    const { layout } = this.state;
    const newArray = [...layout];
    const arrayItem = newArray.find(item => item.i === index);
    if (arrayItem) {
      arrayItem.viewType = type;
      trackUsage('AssetPage.AssetCustomSection.LayoutTypeChange', {
        layout: arrayItem,
        type,
      });
      this.setState({ layout: newArray }, () => {
        localStorage.setItem(LAYOUT_LOCAL_STORAGE, JSON.stringify(newArray));
      });
    }
  };

  render() {
    const { layout, editLayout } = this.state;
    return (
      <div
        className="AssetCustomSection-layout"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'auto',
          backgroundColor: '#efefef',
        }}
      >
        <CustomGridLayout
          editable={editLayout}
          ref={this.gridRef}
          className="layout"
          rowHeight={30}
          cols={{ lg: 4, md: 4, sm: 4, xs: 4, xxs: 4 }}
          onLayoutChange={this.onLayoutChange}
          onDragStart={() => {
            return editLayout;
          }}
        >
          {layout.map((el, i) => (
            <div
              key={el.i}
              data-grid={el}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {editLayout && (
                <DraggingView>
                  <div>
                    <Icon className="big" type="drag" />
                    <h2>{AssetViewerTypeMap[el.viewType]}</h2>
                    <p>
                      Resize by dragging the bottom right corner, drag around
                      each component to make your own layout
                    </p>
                    <ComponentSelector
                      onComponentChange={(viewType: AssetViewerType) => {
                        this.changeLayoutType(viewType, el.i!);
                      }}
                    />
                  </div>
                </DraggingView>
              )}
              <AssetCustomSectionView
                type={el.viewType}
                asset={this.props.asset}
                search={this.props.search}
                onNavigateToPage={this.props.onNavigateToPage}
                onComponentChange={(type: AssetViewerType) => {
                  this.changeLayoutType(type, el.i!);
                }}
              />
              {editLayout && (
                <DeleteButton
                  type="primary"
                  shape="circle"
                  icon="close-circle"
                  size="small"
                  onClick={() => {
                    trackUsage('Component Deleted', {
                      type: layout[i].viewType,
                    });
                    this.setState({
                      layout: [...layout.slice(0, i), ...layout.slice(i + 1)],
                    });
                  }}
                />
              )}
            </div>
          ))}
        </CustomGridLayout>
        <ButtonArea>
          {editLayout && (
            <Button
              shape="round"
              icon="plus"
              size="large"
              onClick={this.onAddComponent}
            >
              Add Layout
            </Button>
          )}
          <Button
            type="primary"
            shape="round"
            icon={editLayout ? 'check' : 'edit'}
            size="large"
            onClick={() => this.changeEdit(!editLayout)}
          >
            {editLayout ? 'Save Layout' : 'Edit Layout'}
          </Button>
        </ButtonArea>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    threed: selectThreeD(state),
    assets: state.assets,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doFetchTypes: fetchTypes,
      doFetchRevisions: fetchRevisions,
      fetchModels,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(AssetCustomSection);
