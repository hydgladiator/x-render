/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import Core from '../index';
import { get } from 'lodash';
import { useStore, useSet } from '../../hooks';
import { getDataPath, getKeyFromPath, getDisplayValue } from '../../utils';
import { Button, Table, Drawer, Space, Popconfirm } from 'antd';
import ArrowUp from '../../components/ArrowUp';
import ArrowDown from '../../components/ArrowDown';
import ErrorMessage from '../RenderField/ErrorMessage';
import {
  MinusCircleOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import './list.less';

const FIELD_LENGTH = 120;

const RenderList = ({
  parentId,
  dataIndex = [],
  children = [],
  errorFields,
  displayType,
}) => {
  const { formData, flatten, onItemChange, removeErrorField } = useStore();

  let renderWidget = 'list';
  try {
    renderWidget = flatten[parentId].schema.widget;
  } catch (error) {}

  const item = flatten[parentId];
  const schema = item && item.schema;

  // 计算 list对应的formData
  const dataPath = getDataPath(parentId, dataIndex);
  let listData;
  if (typeof dataPath === 'string') {
    // TODO: listData会有不少“窟窿”，submit 的时候，listData 需要补齐 or filter
    listData = get(formData, dataPath);
  }

  const displayList = Array.isArray(listData) ? listData : [{}];

  const addItem = () => {
    const newList = [...displayList, {}];
    const newIndex = newList.length - 1;
    onItemChange(dataPath, newList);
    return newIndex;
  };

  const copyItem = idx => {
    const newItem = displayList[idx];
    const newList = [
      ...displayList.slice(0, idx),
      newItem,
      ...displayList.slice(idx),
    ];
    onItemChange(dataPath, newList);
  };

  const deleteItem = idx => {
    // TODO: 删除元素的时候，也需要delete相对于的校验信息（errorFields）
    // remark: 删除时，不存在的item需要补齐，用null
    const newList = displayList.filter((item, kdx) => kdx !== idx);
    onItemChange(dataPath, newList);
    removeErrorField(`${dataPath}[${idx}]`);
  };

  //TODO1: 上线翻页要正确！！现在是错的
  const moveItemUp = idx => {
    if (idx === 0) return;
    const currentItem = displayList[idx];
    const itemAbove = displayList[idx - 1];
    const newList = displayList;
    newList[idx] = itemAbove;
    newList[idx - 1] = currentItem;
    onItemChange(dataPath, newList);
  };

  const moveItemDown = idx => {
    if (idx >= displayList.length - 1) return;
    const currentItem = displayList[idx];
    const itemBelow = displayList[idx + 1];
    const newList = displayList;
    newList[idx] = itemBelow;
    newList[idx + 1] = currentItem;
    onItemChange(dataPath, newList);
  };

  const displayProps = {
    displayList,
    schema,
    dataPath,
    dataIndex,
    children,
    deleteItem,
    addItem,
    copyItem,
    moveItemDown,
    moveItemUp,
    listData,
    flatten,
    errorFields,
    displayType,
  };

  switch (renderWidget) {
    case 'list0':
      return <CardList {...displayProps} />;
    case 'list1':
      return <SimpleList {...displayProps} />;
    case 'list2':
      return <TableList {...displayProps} />;
    case 'list3':
      return <DefaultList {...displayProps} />;
    default:
      return <CardList {...displayProps} />;
  }
};

export default RenderList;

const SimpleList = ({
  schema,
  displayList = [],
  dataIndex,
  children,
  deleteItem,
  addItem,
  copyItem,
}) => {
  let _schema = {
    type: 'object',
    // properties: (schema.items && schema.items.properties) || {},
    properties: {},
    props: schema.props || {},
    $id: schema.$id,
  };
  const _infoItem = {
    schema: _schema,
    rules: [],
    children,
  };

  return (
    <div className="fr-list-1">
      {displayList.map((item, idx) => {
        const fieldsProps = {
          displayType: 'inline',
          _item: _infoItem,
          dataIndex: [...dataIndex, idx],
        };
        if (schema.props && schema.props.hideTitle) {
          fieldsProps.hideTitle = true;
        }
        return (
          <div key={idx} style={{ display: 'flex' }}>
            <Core {...fieldsProps} />
            <div style={{ marginTop: 6 }}>
              <Popconfirm
                title="确定删除?"
                onConfirm={() => deleteItem(idx)}
                okText="确定"
                cancelText="取消"
              >
                <DeleteOutlined style={{ fontSize: 17, marginLeft: 8 }} />
              </Popconfirm>
              <CopyOutlined
                style={{ fontSize: 16, marginLeft: 8 }}
                onClick={() => copyItem(idx)}
              />
            </div>
          </div>
        );
      })}
      <Button
        style={{ marginTop: displayList.length > 0 ? 0 : 8 }}
        type="dashed"
        onClick={addItem}
      >
        新增一条
      </Button>
    </div>
  );
};

const DefaultList = ({
  displayList = [],
  dataPath,
  dataIndex,
  children,
  deleteItem,
  addItem,
  moveItemDown,
  moveItemUp,
  flatten,
  errorFields,
}) => {
  const [state, setState] = useSet({
    showDrawer: false,
    currentIndex: -1,
  });

  const _infoItem = {
    schema: { type: 'object', properties: {} },
    rules: [],
    children,
  };

  const { showDrawer, currentIndex } = state;

  const dataSource = displayList.map((item, index) => ({
    ...item,
    $idx: index,
  }));

  const columns = children.map(child => {
    const item = flatten[child];
    const schema = (item && item.schema) || {};
    const _dataIndex = getKeyFromPath(child);
    return {
      dataIndex: _dataIndex,
      title: schema.required ? (
        <>
          <span className="fr-label-required"> *</span>
          <span>{schema.title}</span>
        </>
      ) : (
        schema.title
      ),
      width: FIELD_LENGTH,
      render: (value, record) => {
        const childPath = getDataPath(child, [record.$idx]);
        const errorObj = errorFields.find(item => item.name == childPath) || {};
        //TODO: 万一error在更深的层，这个办法是find不到的，会展示那一行没有提示。可以整一行加一个红线的方式处理
        return (
          <div>
            <div>{getDisplayValue(value, schema)}</div>
            {errorObj.error && (
              <ErrorMessage message={errorObj.error} schema={schema} />
            )}
          </div>
        );
      },
    };
  });

  columns.push({
    title: '操作',
    key: '$action',
    fixed: 'right',
    width: 80,
    render: (value, record, idx) => {
      const index = (value && value.$idx) || 0;
      return (
        <Space>
          <a onClick={() => openDrawer(index)}>编辑</a>
          <Popconfirm
            title="确定删除?"
            onConfirm={() => deleteItem(idx)}
            okText="确定"
            cancelText="取消"
          >
            <a>删除</a>
          </Popconfirm>
          {/* <ArrowUp height={18} width={24} onClick={() => moveItemUp(index)} />
          <ArrowDown
            height={18}
            width={24}
            onClick={() => moveItemDown(index)}
          /> */}
        </Space>
      );
    },
  });

  const openDrawer = index => {
    setState({
      showDrawer: true,
      currentIndex: index,
    });
  };

  const closeDrawer = () => {
    setState({
      showDrawer: false,
      currentIndex: -1,
    });
  };

  const handleAdd = () => {
    const newIndex = addItem();
    openDrawer(newIndex);
  };

  return (
    <>
      <div className="w-100 mb2 tr">
        <Button type="primary" size="small" onClick={handleAdd}>
          新增
        </Button>
      </div>
      <Drawer
        width="600"
        title="编辑"
        placement="right"
        onClose={closeDrawer}
        visible={showDrawer}
      >
        <div className="fr-container">
          <Core
            // id={children[currentIndex]}
            _item={_infoItem}
            dataIndex={[...dataIndex, currentIndex]}
          />
        </div>
      </Drawer>
      <Table
        scroll={{ x: 'max-content' }}
        columns={columns}
        dataSource={dataSource}
        rowClassName={(record, idx) => {
          const index = record && record.$idx;
          const hasError = errorFields.find(
            item => item.name.indexOf(`${dataPath}[${index}]`) > -1
          );
          return hasError ? 'fr-row-error' : '';
        }}
        rowKey="$idx"
        size="small"
        pagination={{ size: 'small', hideOnSinglePage: true }}
      />
    </>
  );
};

const TableList = ({
  displayList = [],
  dataIndex,
  children,
  deleteItem,
  addItem,
  flatten,
}) => {
  const dataSource = displayList.map((item, idx) => {
    return { index: idx };
  });

  const columns = children.map(child => {
    const item = flatten[child];
    const schema = (item && item.schema) || {};
    return {
      dataIndex: child,
      title: schema.required ? (
        <>
          <span className="fr-label-required"> *</span>
          <span>{schema.title}</span>
        </>
      ) : (
        schema.title
      ),
      width: FIELD_LENGTH,
      render: (value, record, index) => {
        // Check: record.index 似乎是antd自己会给的，不错哦
        const childIndex = [...dataIndex, record.index];
        return (
          <Core
            hideTitle={true}
            displayType="inline"
            key={index.toString()}
            id={child}
            dataIndex={childIndex}
          />
        );
      },
    };
  });

  columns.push({
    title: '操作',
    key: '$action',
    fixed: 'right',
    width: 60,
    render: (value, record, index) => {
      return (
        <Popconfirm
          title="确定删除?"
          onConfirm={() => deleteItem(idx)}
          okText="确定"
          cancelText="取消"
        >
          <a>删除</a>
        </Popconfirm>
      );
    },
  });

  return (
    <>
      <div className="w-100 mb2 tr">
        <Button type="primary" size="small" onClick={addItem}>
          新增
        </Button>
      </div>
      <Table
        scroll={{ x: 'max-content' }}
        columns={columns}
        dataSource={dataSource}
        rowKey="index"
        size="small"
        pagination={{ size: 'small', hideOnSinglePage: true }}
      />
    </>
  );
};

const CardList = ({
  displayList = [],
  dataIndex,
  children,
  deleteItem,
  copyItem,
  addItem,
  displayType,
}) => {
  const _infoItem = {
    schema: { type: 'object', properties: {} },
    rules: [],
    children,
  };

  return (
    <>
      <div className="fr-card-list">
        {displayList.map((item, idx) => {
          return (
            <div
              className={`fr-card-item ${
                displayType === 'row' ? 'fr-card-item-row' : ''
              }`}
              key={idx}
            >
              <div className="fr-card-index">{idx + 1}</div>
              <Core
                displayType={displayType}
                _item={_infoItem}
                dataIndex={[...dataIndex, idx]}
              />

              <Space direction="horizontal" className="fr-card-toolbar">
                <Popconfirm
                  title="确定删除?"
                  onConfirm={() => deleteItem(idx)}
                  okText="确定"
                  cancelText="取消"
                >
                  <DeleteOutlined style={{ fontSize: 17, marginLeft: 8 }} />
                </Popconfirm>
                <CopyOutlined
                  style={{ fontSize: 16, marginLeft: 8 }}
                  onClick={() => copyItem(idx)}
                />
              </Space>
            </div>
          );
        })}
      </div>
      <Button
        style={{ marginTop: displayList.length > 0 ? 0 : 8 }}
        type="dashed"
        onClick={addItem}
      >
        新增一条
      </Button>
    </>
  );
};
