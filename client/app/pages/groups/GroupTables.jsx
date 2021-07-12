import { filter, map, includes, toLower } from "lodash";
import React from "react";
import Button from "antd/lib/button";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import DownOutlinedIcon from "@ant-design/icons/DownOutlined";

import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import navigateTo from "@/components/ApplicationArea/navigateTo";

import { wrap as itemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ResourceItemsSource } from "@/components/items-list/classes/ItemsSource";
import { StateStorage } from "@/components/items-list/classes/StateStorage";

import LoadingState from "@/components/items-list/components/LoadingState";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";
import AddTableDialog from "./components/AddTableDialog";
import { DataSourcePreviewCard } from "@/components/PreviewCard";

import GroupName from "@/components/groups/GroupName";
import ListItemAddon from "@/components/groups/ListItemAddon";
import Sidebar from "@/components/groups/DetailsPageSidebar";
import Layout from "@/components/layouts/ContentWithSidebar";
import wrapSettingsTab from "@/components/SettingsWrapper";

import notification from "@/services/notification";
import { currentUser } from "@/services/auth";
import Group from "@/services/group";
import DataSource from "@/services/data-source";
import routes from "@/services/routes";

// import DynamicComponent from "@/components/DynamicComponent";
// import { getEditorComponents } from "@/components/queries/editor-components";
class GroupTables extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };
  constructor(props) {
    super(props);
    this.state = {groupTables: <div></div>};
  }

  groupId = parseInt(this.props.controller.params.groupId, 10);

  group = null;

  listDataSource = [];

  sidebarMenu = [
    {
      key: "users",
      href: `groups/${this.groupId}`,
      title: "Members",
    },
    {
      key: "datasources",
      href: `groups/${this.groupId}/data_sources`,
      title: "Data Sources",
      isAvailable: () => currentUser.isAdmin,
    },
    {
      key: "tables",
      href: `groups/${this.groupId}/tables`,
      title: "Tabels",
      isAvailable: () => currentUser.isAdmin,
    },
  ];

  listColumns = [
    Columns.custom((text, schema) =>{return <div>{schema.name}</div>}, {
      title: "Name",
      field: "name",
      width: null,
    }),
    Columns.custom(
      (text, schema) => {
        const menu = (
          <Menu
            selectedKeys={[schema.role]}
            onClick={item => this.setDataSourcePermissions(schema, item.key)}>
            <Menu.Item key="no_permission">No Permission</Menu.Item>
            <Menu.Item key="full_access">Full Access</Menu.Item>
            <Menu.Item key="view_only">View Only</Menu.Item>
          </Menu>
        );

        return (
          <Dropdown trigger={["click"]} overlay={menu}>
            <Button className="w-100" aria-label="Permissions">
              {schema.role==="no_permission" ?"No Permission":(schema.role==="view_only" ? "View Only" : "Full Access")}
              <DownOutlinedIcon aria-hidden="true" />
            </Button>
          </Dropdown>
        );
      },
      {
        width: "1%",
        className: "p-r-0",
        isAvailable: () => currentUser.isAdmin,
      }
    ),
  ];
  
  componentDidMount() {
    Group.get({ id: this.groupId })
      .then(group => {
        this.group = group;
        this.forceUpdate();
      })
      .catch(error => {
        this.props.controller.handleError(error);
      });

      Group.dataSources({ id: this.groupId }).then(dataSources => {
        this.listDataSource = dataSources;
        const schemaPromises = [];
        dataSources.forEach(element => {
          const schemaps =  DataSource.fetchSchema(element, false);
          const roleps =  Group.dataSourceRoles({id:this.groupId,dataSourceId:element.id});
          schemaPromises.push([schemaps,roleps]);
        });
       
      const allpromises = [];
      schemaPromises.forEach(element => {
        allpromises.push(Promise.all(element));
      });

       Promise.all(allpromises).then((result) => {
         for (let index = 0; index < this.listDataSource.length; index++) {
           const ds = this.listDataSource[index];
           const schema = result[index][0];
           const tableRole = result[index][1];
           for (let key = 0; key < schema.length; key++) {
            const table = schema[key];
            let schemaRole = tableRole.hasOwnProperty(table.name)?tableRole[table.name]:"no_permission";
            table["role"] =schemaRole;
            table["dsid"] = ds.id;
           }
           ds["schema"] = schema;
         }
        
         let groupTables = this.listDataSource.map((ds) =>{
           return <div key={ds.id} ><DataSourcePreviewCard dataSource={ds} withLink />
           <ItemsTable
                  items={ds.schema}
                  columns={this.listColumns}
                  showHeader={false}
                />
           </div>
         });
         this.setState({groupTables})
        }).catch(error => {
         
        });;
        
      })
      .catch(error => {
        this.props.controller.handleError(error);
      });
  }

   

  removeGroupDataSource = datasource => {
    Group.removeDataSource({ id: this.groupId, dataSourceId: datasource.id })
      .then(() => {
        this.props.controller.updatePagination({ page: 1 });
        this.props.controller.update();
      })
      .catch(() => {
        notification.error("Failed to remove table from group.");
      });
  };

  setDataSourcePermissions = (sechma, permission) => {
    Group.updateDataSource({ id: this.groupId, dataSourceId: sechma.dsid }, { table_name: sechma.name,table_permission:permission})
      .then(() => {
        sechma.role = permission;
        let groupTables = this.listDataSource.map((ds) =>{
          return <div key={ds.id} ><DataSourcePreviewCard dataSource={ds} withLink />
          <ItemsTable
                 items={ds.schema}
                 columns={this.listColumns}
                 showHeader={false}
               />
          </div>
        });
        this.setState({groupTables})
      })
      .catch(() => {
        notification.error("Failed change data source permissions.");
      });
  };

  addTables = () => {
    const allDataSources = DataSource.query();
    const alreadyAddedDataSources = map(this.props.controller.allItems, ds => ds.id);
    AddTableDialog.showModal({
      dialogTitle: "Add Tables",
      group_id:this.groupId,
      searchItems: searchTerm => {
        searchTerm = toLower(searchTerm);
        return allDataSources.then(items => filter(items, ds => includes(toLower(ds.name), searchTerm)));
      },
      renderItem: (item, { isSelected }) => {
        const alreadyInGroup = includes(alreadyAddedDataSources, item.id);
        return {
          content: (
            <DataSourcePreviewCard dataSource={item}>
              <ListItemAddon isSelected={isSelected} alreadyInGroup={alreadyInGroup} />
            </DataSourcePreviewCard>
          ),
          isDisabled: alreadyInGroup,
          className: isSelected || alreadyInGroup ? "selected" : "",
        };
      },
      renderStagedItem: (item, { isSelected }) => ({
        content: (
          <DataSourcePreviewCard dataSource={item}>
            <ListItemAddon isSelected={isSelected} isStaged />
          </DataSourcePreviewCard>
        ),
      }),
    }).onClose(items => {
      const promises = map(items, ds => Group.addDataSource({ id: this.groupId }, { data_source_id: ds.id }));
      return Promise.all(promises).then(() => this.props.controller.update());
    });
  };

  render() {
    const { controller } = this.props;
   const groupTables = this.state.groupTables;
    return (
      <div data-test="Group">
        <GroupName className="d-block m-t-0 m-b-15"group={this.group} onChange={() => this.forceUpdate()} />
        <Layout>
          <Layout.Sidebar>
            <Sidebar
              controller={controller}
              group={this.group}
              items={this.sidebarMenu}
              canAddTables={false}
              onAddTablesClick={this.addTables}
              onGroupDeleted={() => navigateTo("groups")}
            />
          </Layout.Sidebar>
          <Layout.Content>
            {!controller.isLoaded && <LoadingState className="" />}
            {controller.isLoaded && controller.isEmpty && (
              <div className="text-center">
                <p>There are no tables in this group yet.</p>
                {currentUser.isAdmin && (
                  <Button type="primary" onClick={this.addTables}>
                    <i className="fa fa-plus m-r-5" aria-hidden="true" />
                    Add Tables
                  </Button>
                )}
              </div>
            )}
            {controller.isLoaded && !controller.isEmpty && (
              <div className="table-responsive">
                {groupTables}
              </div>
            )}
          </Layout.Content>
        </Layout>
      </div>
    );
  }
}

const GroupTablesPage = wrapSettingsTab(
  "Groups.Tables",
  null,
  itemsList(
    GroupTables,
    () =>
      new ResourceItemsSource({
        isPlainList: true,
        getRequest(unused, { params: { groupId } }) {
          return { id: groupId };
        },
        getResource() {
          return Group.dataSources.bind(Group);
        },
      }),
    () => new StateStorage({ orderByField: "name" })
  )
);

routes.register(
  "Groups.Tables",
  routeWithUserSession({
    path: "/groups/:groupId/tables",
    title: "Group Tables",
    render: pageProps => <GroupTablesPage {...pageProps} currentPage="tables" />,
  })
);
