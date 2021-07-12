import { find, includes, map } from "lodash";
import React, {useCallback,  useState, useEffect } from "react";
import PropTypes from "prop-types";
import Modal from "antd/lib/modal";
import Button from "antd/lib/button";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import notification from "@/services/notification";
import DynamicComponent from "@/components/DynamicComponent";
import { getEditorComponents } from "@/components/queries/editor-components";
import useTableDataSources from "../hooks/useTableDataSources";
import "./AddTableDialog.less";

function AddTableDialog({
  dialog,
  dialogTitle,
  width,
  extraFooterContent,
  group_id,
  selectedItems,
}) {
  const [dataSource, setDataSource] = useState(null);
  const { dataSourcesLoaded, dataSources} = useTableDataSources({group_id});
  const { SchemaBrowser } = getEditorComponents(dataSource && dataSource.type);
  useEffect(() => {
    if (dataSourcesLoaded ) {
      const firstDataSource = dataSources.length > 0 ? dataSources[0] : null;
      setDataSource(firstDataSource)
    }
  }, [dataSourcesLoaded, dataSources]);

  const save = useCallback(() => {
    dialog.close(selectedItems).catch(error => {
      if (error) {
        notification.error("Failed to save some of selected items.");

      }
    });
  }, [dialog, selectedItems]);

  const handleDataSourceChange = useCallback(
    dataSourceId => {
      if (dataSourceId) {
        try {
          localStorage.setItem("lastSelectedDataSourceId", dataSourceId);
        } catch (e) {
          // `localStorage.setItem` may throw exception if there are no enough space - in this case it could be ignored
        }
      }
    const ds= find(dataSources, obj => {
        return obj.id === dataSourceId;
    })
      setDataSource(ds)
    },
    [dataSources,setDataSource]
  );

  


  const handleSchemaItemSelect = useCallback(schemaItem => {
    // if (editorRef.current) {
    //   editorRef.current.paste(schemaItem);
    // }
  }, []);

  return (
    <Modal
      {...dialog.props}
      className="select-items-dialog"
      width={width}
      title={dialogTitle}
      footer={
        <div className="d-flex align-items-center">
          <span className="flex-fill m-r-5" style={{ textAlign: "left", color: "rgba(0, 0, 0, 0.5)" }}>
            {extraFooterContent}
          </span>
          <Button {...dialog.props.cancelButtonProps} onClick={dialog.dismiss}>
            Cancel
          </Button>
          <Button
            {...dialog.props.okButtonProps}
            onClick={save}
            disabled={dialog.props.okButtonProps.disabled}
            type="primary">
            Save
          </Button>
        </div>
      }>
      <div>
            {dataSourcesLoaded && (
              <div className="editor__left__data-source">
                <DynamicComponent
                  name={"QuerySourceDropdown"}
                  dataSources={dataSources}
                  value={dataSource ? dataSource.id : undefined}
                  disabled={!dataSourcesLoaded || dataSources.length === 0}
                  loading={!dataSourcesLoaded}
                  onChange={handleDataSourceChange}
                />
              </div>
            )}
            
            <div className="editor__left__schema subSchema">
              <SchemaBrowser
                dataSource={dataSource}
                onItemSelect={handleSchemaItemSelect}
              />
            </div>
          
      </div>
    </Modal>
  );
}

AddTableDialog.propTypes = {
  dialog: DialogPropType.isRequired,
  dialogTitle: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  extraFooterContent: PropTypes.node,
  showCount: PropTypes.bool,
};

AddTableDialog.defaultProps = {
  dialogTitle: "Add Items",
  width: "30%",
  extraFooterContent: null,
  showCount: false,
};

export default wrapDialog(AddTableDialog);
