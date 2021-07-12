import { filter, find } from "lodash";
import { useState, useMemo, useEffect } from "react";
import Group from "@/services/group";

export default function useTableDataSources(query) {
    const [allDataSources, setAllDataSources] = useState([]);
    const [dataSourcesLoaded, setDataSourcesLoaded] = useState(false);
    const dataSources = useMemo(() => filter(allDataSources, ds => !ds.view_only), [
        allDataSources
    ]);

    useEffect(() => {
        let cancelDataSourceLoading = false;
        Group.dataSources({ id: query.group_id }).then(data => {
            if (!cancelDataSourceLoading) {
                setDataSourcesLoaded(true);
                setAllDataSources(data);
            }
        });

        return () => {
            cancelDataSourceLoading = true;
        };
    }, [query.group_id]);

    return useMemo(() => ({ dataSourcesLoaded, dataSources }), [dataSourcesLoaded, dataSources]);
}