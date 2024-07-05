import React, { useMemo, useState, useEffect } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import "@ag-grid-community/styles/ag-grid.css";
import "@ag-grid-community/styles/ag-theme-quartz.css";
import axios from 'axios';

const App = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100vh" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [data, setData] = useState([]);
  // const [data2B, setData2B] = useState([]);
  // const [selectedData, setSelectedData] = useState([]);

  const [columnDefs] = useState([
    {
      headerName: "Invoice number",
      children: [
        { columnGroupShow: "closed", field: "booking_invoice_number" },
        { columnGroupShow: "open", field: "twoB_invoice_number" },
        { columnGroupShow: "open", field: "selected_invoice_number" },
        { columnGroupShow: "open", field: "selected_invoice_number_score" },
      ],
    },
    {
      headerName: "GST number",
      children: [
        { columnGroupShow: "closed", field: "booking_supplier_gst" },
        { columnGroupShow: "open", field: "twoB_seller_vat_number" },
        { columnGroupShow: "open", field: "selected_gst" },
        { columnGroupShow: "open", field: "selected_gst_score" },
      ],
    },
    {
      headerName: "Invoice date",
      children: [
        { columnGroupShow: "closed", field: "booking_invoice_date" },
        { columnGroupShow: "open", field: "twoB_invoice_date" },
        { columnGroupShow: "open", field: "selected_invoice_date" },

        { columnGroupShow: "open", field: "selected_invoice_date_score" },
      ],
    },
    {
      headerName: "Invoice amount",
      children: [
        { columnGroupShow: "closed", field: "booking_invoice_amount" },
        { columnGroupShow: "open", field: "twoB_invoice_amount" },
        { columnGroupShow: "open", field: "selected_invoice_amount" },
        { columnGroupShow: "open", field: "selected_invoice_amount_score" },
      ],
    },
  ]);

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/matchesOutputTable');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching booking data:', error);
      }
    };
    fetchBookingData();
  }, []);
  console.log(data, 'response')

 

  const rowData = useMemo(() => {
    if (data.length === 0) {
      return [];
    }

    const mergedData = data.map(entry => {
      const respective2BData = entry.selected?.respective_2b_data;
      const selectedData = entry.selected || {};
      

      return {
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

        selected_invoice_number:selectedData?.inum,
        selected_gst:selectedData?.gstin,
        selected_invoice_date:selectedData?.gendt,
        selected_invoice_amount:selectedData?.val    
      };
      
    });
    console.log("rowData:", mergedData); 
    return mergedData;
  }, [data]);
  

  return (
    <div style={containerStyle}>
      <div style={gridStyle} className="ag-theme-quartz">
        <AgGridReact rowData={rowData} columnDefs={columnDefs} />
      </div>
    </div>
  );
};

export default App;

