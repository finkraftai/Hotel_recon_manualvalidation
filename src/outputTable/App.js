import React, { useMemo, useState, useEffect, useRef } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import "@ag-grid-community/styles/ag-grid.css";
import "@ag-grid-community/styles/ag-theme-quartz.css";
import { ModuleRegistry } from "@ag-grid-community/core";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import axios from 'axios';
import RemarksEditor from "./RemarksEditor";
import { ColumnsToolPanelModule } from "@ag-grid-enterprise/column-tool-panel";
import { CsvExportModule } from "@ag-grid-community/csv-export";
import { FiltersToolPanelModule } from "@ag-grid-enterprise/filter-tool-panel";
import { MenuModule } from "@ag-grid-enterprise/menu";
import { RowGroupingModule } from "@ag-grid-enterprise/row-grouping";
import { SetFilterModule } from "@ag-grid-enterprise/set-filter";

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ColumnsToolPanelModule,
  CsvExportModule,
  FiltersToolPanelModule,
  MenuModule,
  RowGroupingModule,
  SetFilterModule,
]);

const App = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100vh" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [data, setData] = useState([]);
  const [data2B, setData2B] = useState([]);

  const [columnDefs] = useState([
    {
      headerName: "Booking data",
      
      // enableRowGroup: true,
      children: [
        { columnGroupShow: "closed", headerName: "Supplier", field: "booking_supplier_name", rowDrag: true, filter: "agTextColumnFilter", enableValue: true,enableRowGroup: true},
        { columnGroupShow: "open", headerName: "Invoice_number", field: "booking_invoice_number", rowDrag: true, filter: "agNumberColumnFilter", enableValue: true, enableRowGroup: true},
        { columnGroupShow: "open", headerName: "Invoice_date", field: "booking_invoice_date", rowDrag: true, filter: "agDateColumnFilter", enableValue: true },
        { columnGroupShow: "open", headerName: "Supplier_GST", field: "booking_supplier_gst", rowDrag: true, filter: "agNumberColumnFilter", enableValue: true},
        { columnGroupShow: "open", headerName: "Customer_GST", field: "booking_customer_gst", rowDrag: true, filter: "agNumberColumnFilter", enableValue: true},
        { columnGroupShow: "open", headerName: "Invoice_amount", field: "booking_invoice_amount", rowDrag: true, filter: "agNumberColumnFilter", aggFunc: "sum" },
      ],
    },
    {
      headerName: "Invoice data",
      children: [
      //  { columnGroupShow: "closed", field: "invoice_seller_name", rowDrag: true, filter: "agTextColumnFilter", enableValue: true},
        { columnGroupShow: "open", field: "invoice_invoice_number", rowDrag: true, filter: "agNumberColumnFilter", enableValue: true},
        { columnGroupShow: "open", field: "invoice_invoice_date", rowDrag: true, filter: "agDateColumnFilter", enableValue: true},
        { columnGroupShow: "open", field: "invoice_buyer_name", rowDrag: true, filter: "agTextColumnFilter", enableValue: true},
        { columnGroupShow: "open", field: "invoice_invoice_amount", rowDrag: true, filter: "agNumberColumnFilter", enableValue: true},
      ],
    },
    {
      headerName: "2B data",
      children: [
        { columnGroupShow: "closed", field: "twoB_seller_name", rowDrag: true, filter: "agTextColumnFilter", enableValue: true},
        { columnGroupShow: "open", field: "twoB_invoice_number", rowDrag: true, filter: "agNumberColumnFilter", enableValue: true},
        { columnGroupShow: "open", field: "twoB_invoice_date", rowDrag: true, filter: "agDateColumnFilter", enableValue: true},
        { columnGroupShow: "open", field: "twoB_seller_vat_number", rowDrag: true, filter: "agNumberColumnFilter", enableValue: true},
        { columnGroupShow: "open", field: "twoB_buyer_vat_number", rowDrag: true, filter: "agNumberColumnFilter", enableValue: true},
        { columnGroupShow: "open", field: "twoB_invoice_amount", rowDrag: true, filter: "agNumberColumnFilter", enableValue: true},
      ],
    },
    {
      headerName: "Score",
      children: [
        { columnGroupShow: "closed", headerName: "Invoice number score", field: "selected_invoice_number_score", rowDrag: true, filter: "agNumberColumnFilter", enableValue: true },
        { columnGroupShow: "open", headerName: "Invoice date score", field: "selected_invoice_date_score", rowDrag: true, filter: "agNumberColumnFilter", enableValue: true },
        { columnGroupShow: "open", headerName: "Invoice amount score", field: "selected_invoice_amount_score", rowDrag: true, filter: "agNumberColumnFilter", enableValue: true },
        { columnGroupShow: "open", headerName: "GST score", field: "selected_gst_score", rowDrag: true, filter: "agNumberColumnFilter", enableValue: true },
      ],
    },
    {
      headerName: "Confidence",
      children: [
        { columnGroupShow: "closed", field: "Machine", rowDrag: true },
        { columnGroupShow: "closed", field: "Human", rowDrag: true },
      ],
    },
    {
      headerName: "Remarks",
      field: "remarks",
      editable: true,
      rowDrag: true,
      cellRendererFramework: RemarksEditor,
      filter: "agTextColumnFilter"
    },
  ]);
  const rowGroupPanelShow = 'always';
const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 150,
      filter: true,
    };
  }, []);

  const autoGroupColumnDef = useMemo(() => {
    return {
      minWidth: 250,
    };
  }, []);

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/matchesOutputTable');
        // const jsonData=JSON.parse(response.data)
        
        setData(response.data);
      } catch (error) {
        console.error('Error fetching booking data:', error);
      }
    };
    fetchBookingData();
  }, []);
  console.log(typeof data);
  console.log(data, 'booking data')



  


  const rowData = useMemo(() => {
    if (data.length === 0 ) {
      return [];
    }

    const mergedData = data.map(entry => {
      const respective2BData = entry.selected?.respective_2b_data;
      const selectedData = entry.selected || {};

      return {
        _id:entry._id,
        remarks:entry.remarks,
        booking_supplier_name: entry.booking_data?.seller_name,
        booking_invoice_number: entry.booking_data?.invoice_number,
        booking_invoice_date: entry.booking_data?.invoice_date,
        booking_supplier_gst: entry.booking_data?.seller_vat_number,
        booking_customer_gst: entry.booking_data?.buyer_vat_number,
        booking_invoice_amount: entry.booking_data?.invoice_amount,

        invoice_seller_name: entry.invoice_data?.seller_name,
        invoice_invoice_number: entry.invoice_data?.invoice_number,
        invoice_invoice_date: entry.invoice_data?.invoice_date,
        invoice_buyer_name: entry.invoice_data?.buyer_name,
        invoice_invoice_amount: entry.invoice_data?.invoice_amount,

        twoB_seller_name: respective2BData?.trdnm,
        twoB_invoice_number: respective2BData?.inum,
        twoB_invoice_date: respective2BData?.dt,
        twoB_seller_vat_number: respective2BData?.gstin,
        twoB_buyer_vat_number: respective2BData?.cstin,
        twoB_invoice_amount: respective2BData?.val,

        selected_invoice_number_score: selectedData?.invoice_Number_Score,
        selected_invoice_date_score: selectedData?.invoiceDate_Score,
        selected_invoice_amount_score: selectedData?.invoiceAmount_Score,
        selected_gst_score: selectedData?.invoiceGstin_Score,


      };
      
    });
    

    return mergedData;
  }, [data]);

  const onCellValueChanged = async (params) => {
    if (params.colDef.field === 'remarks') {
      const updatedRow = params.data;
      console.log('Updated Remarks:', updatedRow.remarks);
      try {
        await axios.post(`http://localhost:5000/saveRemarks?documentId=${updatedRow._id}`, {
          remarks: updatedRow.remarks,
        });
        console.log('Remarks saved successfully');
      } catch (error) {
        console.error('Error saving remarks:', error);
      }
    }
  };
  console.log(rowData, 'rowData')

  return (
    <div style={containerStyle}>
      <div style={gridStyle} className="ag-theme-quartz">
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          // defaultColDef={defaultColDef}
          // autoGroupColumnDef={autoGroupColumnDef}
          // sideBar={true}
          sideBar='filters'
          rowGroupPanelShow={rowGroupPanelShow}
          onCellValueChanged={onCellValueChanged}
          
        />
      </div>
    </div>
  );
};

export default App;