import React from 'react';

const RemarksEditor = ({ value, data, node, column, api, context }) => {
  const onChange = (event) => {
    const newValue = event.target.value;
    node.setDataValue(column.getColId(), newValue);
    api.refreshCells({ rowNodes: [node], force: true });
  };

  return <input value={value} onChange={onChange} style={{ width: '100%' }} />;
};

export default RemarksEditor;