import React, { useState, useEffect, useRef} from 'react';
import '../selecting/Sap.css';
import { Popconfirm } from 'antd';
import axios from 'axios';

const App = () => {
  const [selectedColumn, setSelectedColumn] = useState([]);
  const [matchesData, setMatchesData] = useState([]);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBookingTable, setShowBookingTable] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [history, setHistory] = useState([]);
  const [imageSrc, setImageSrc] = useState(null);
  const [isNextDisabled, setIsNextDisabled] = useState(true);
  const currentIndexRef = useRef(currentIndex); 
  const [docs, setDocs] = useState([]); 

  useEffect(() => {
    fetchMatchesData();
  }, []);
  useEffect(() => {
    currentIndexRef.current = currentIndex; // Update ref when currentIndex changes
}, [currentIndex]);

  useEffect(() => {
    if (currentDoc?.s3_link) {
      setImageSrc(currentDoc.s3_link);
    }
  }, [currentDoc]);

  useEffect(() => {
    setIsNextDisabled(selectedColumn.length === 0);
  }, [selectedColumn]);

  const fetchMatchesData = () => {
    axios.get('http://localhost:5000/matches')
      .then(response => {
        console.log('API Response:', response.data);
        setMatchesData(response.data);

        if (response.data.length > 0) {
          setCurrentDoc(createDoc(response.data[0]));
        }
      })
      .catch(error => {
        console.error('Error fetching matches data:', error);
      });
  };

  const createDoc = (docData) => {
    setPdfUrl(docData.url); // Assuming 'url' is part of docData
    return {
      _id: docData._id,
      s3_link: docData.s3_link,
      df_A: {
        seller_vat_number: docData.invoice_data?.hotel_gstin || 'N/A',
        invoice_number: docData.invoice_data?.invoice_number || 'N/A',
        invoice_amount: docData.invoice_data?.invoice_amount || 'N/A',
        invoice_date: docData.invoice_data?.invoice_date || 'N/A',
      },
      df_B: docData.Matches?.map(match => ({
        trdnm: match.respective_2b_data?.trdnm || 'N/A',
        ctin: match.respective_2b_data?.ctin || 'N/A',
        inum: match.respective_2b_data?.inum || 'N/A',
        val: match.respective_2b_data?.val || 'N/A',
        dt: match.respective_2b_data?.dt || 'N/A',
        gstin_score: match.gstin_score || 0,
        inv_no_score: match.number_score || 0,
        amount_score: match.amount_score || 0,
        date_score: match.date_score || 0,
        combined_score: match.combined_score || 0,
      })) || [],
      booking_data: docData.booking_data || 'N/A',
    };
  };

  const handleNextClick = async (confirmed) => {
    const selectedData = matchesData[currentIndex]?.Matches[selectedColumn];
    const documentId = currentDoc?._id;

    if (!documentId) {
      console.error('Document ID is not defined');
      return;
    }

    try {
      await axios.post(`http://localhost:5000/saveSelectedColumn?documentId=${documentId}`, selectedData);
      console.log('Data saved successfully');
      await saveSeenValue(documentId, confirmed);
      const nextDocData = await fetchNextDocument();

      if (nextDocData) {
        setHistory(prevHistory => [...prevHistory, { doc: currentDoc, selected: selectedColumn }]);
        setSelectedColumn([]);
        setCurrentDoc(createDoc(nextDocData));
        setCurrentIndex(prevIndex => Math.min(prevIndex + 1, matchesData.length - 1));
      } else {
        console.log("No more documents to fetch.");
      }
    } catch (error) {
      console.error('Error during confirmation handling:', error);
    }
  };

  // const handleSkipClick = async () => {
  //   const documentId = currentDoc?._id;

  //   if (!documentId) {
  //     console.error('Document ID is not defined');
  //     return;
  //   }

  //   try {
  //     const nextDocData = await fetchNextDocument();

  //     if (nextDocData) {
  //       setHistory(prevHistory => [...prevHistory, { doc: currentDoc, selected: selectedColumn }]);
  //       setSelectedColumn([]);
  //       setCurrentDoc(createDoc(nextDocData));
  //       setCurrentIndex(prevIndex => Math.min(prevIndex + 1, matchesData.length - 1));
  //     } else {
  //       console.log("No more documents to fetch.");
  //     }
  //   } catch (error) {
  //     console.error('Error during skip handling:', error);
  //   }
  // };

  const saveSeenValue = async (documentId, confirmed) => {
    if (!documentId) {
      console.error('Document ID is not defined');
      return;
    }

    try {
      await axios.post(`http://localhost:5000/saveSeenValue?documentId=${documentId}`, { seen: confirmed });
      console.log(`Seen value updated for document ID: ${documentId}`);
    } catch (error) {
      console.error('Error saving seen value:', error);
    }
  };

  const fetchNextDocument = async () => {
    try {
      console.log('Fetching next document from backend...');
      const response = await axios.get('http://localhost:5000/nextDocument', {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          documentId: currentDoc?._id,
        },
      });

      const nextDocData = response.data;
      console.log('Response from nextDocument API:', nextDocData);
      return nextDocData ? nextDocData : null;
    } catch (error) {
      console.error('Error fetching the next document:', error);
      return null;
    }
  };

  const updateDocumentDisplay = (doc) => {
    if (doc?.s3_link) {
      if (doc.s3_link.endsWith('.pdf')) {
        setPdfUrl(doc.s3_link);
        setImageSrc(null);
      } else {
        setImageSrc(doc.s3_link);
        setPdfUrl(null);
      }
    } else {
      setPdfUrl(null);
      setImageSrc(null);
    }
  };

  
const fetchPreviousDocument = async () => {
  if (history.length === 0) {
    console.log("No previous documents in history.");
    return;
  }

  console.log("Fetching previous document...");

  const prevDocument = history[history.length - 1].doc;
  const prevSelectedColumn = history[history.length - 1].selected;

  // Set the current document and selected columns to the previous state
  setCurrentDoc(prevDocument);
  setSelectedColumn(prevSelectedColumn || []);

  // Remove the last item from history
  setHistory(prevHistory => prevHistory.slice(0, -1));

  // Move the currentIndex back
  setCurrentIndex(prevIndex => Math.max(0, prevIndex - 1));

  // Update the document display
  updateDocumentDisplay(prevDocument);
};

  const handleNoClick = async () => {
    console.log('No clicked');
    await handleNextClick(false);
  };

  const handleYesClick = async () => {
    console.log('Yes clicked');
    await handleNextClick(true);
  };

  const handlePrevious = async () => {
    // Update selected field to true (or false if 'No' is clicked)
    await updateSelectedField(true);
  
    // Fetch previous document from history
    fetchPreviousDocument();
  };

  const handleSkip = async () => {
    const documentId = currentDoc?._id;
  
    if (!documentId) {
      console.error('Document ID is not defined');
      return;
    }
  
    try {
      // Update selected field to true or handle as needed
      await updateSelectedField(true, documentId); // Assuming updateSelectedField accepts document ID as second argument
  
      // Fetch next document without changing currentIndex
      const nextDocData = await fetchNextDocument();
  
      if (nextDocData) {
        // Optionally save current document and selections to history
        setHistory(prevHistory => [...prevHistory, { doc: currentDoc, selected: selectedColumn }]);
        setSelectedColumn([]);
        setCurrentDoc(createDoc(nextDocData));
  
        // Increment currentIndex after successfully fetching next document
        setCurrentIndex(prevIndex => prevIndex + 1);
      } else {
        console.log("No more documents to fetch.");
      }
    } catch (error) {
      console.error('Error during skip handling:', error);
    }
  };

  // const handleSkip = async () => {
  //   if (!currentDoc) return;

  //   const docId = currentDoc._id;

  //   // Check if matchesData exists for the current document
  //   if (!matchesData) {
  //     await fetchMatchesData(docId); // Fetch matches data if not already fetched
  //     return;
  //   }

  //     // If matchesData is already fetched, proceed to fetch the next document
  // try {
  //   await fetchNextDocument(); // Fetch next document
  // } catch (error) {
  //   console.error('Error fetching next document:', error);
  // }
  // };

  

 



  
  const handlePopconfirm = async (confirmed) => {
    // Update selected field based on confirmation
    await updateSelectedField(confirmed);

    // Move to next document
    setCurrentIndex(prevIndex => prevIndex + 1);
  };

  const updateSelectedField = async (selectedValue) => {
    try {
      const idToUpdate = matchesData[currentIndex]._id;
      await axios.patch(`http://localhost:5000/updateSelected/${idToUpdate}`, { selected: selectedValue });
    } catch (error) {
      console.error('Error updating selected field:', error);
    }
  };
  const toggleBookingTable = () => {
    setShowBookingTable(!showBookingTable);
  };
  const getColor = (value) => {
    if (value > 80) {
      return "#388E3C";
    } else if (value >= 50 && value <= 80) {
      return "#C0CA33";
    } else {
      return "#E53935";
    }
  };
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    const [day, month, year] = timestamp.split("-");
    const isoDateString = `${year}-${month}-${day}`;
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toISOString().split("T")[0];
  };


  

  return (
    <div>
      <div className='container'>
      {pdfUrl ? (
        <iframe src={pdfUrl} width="600" height="800" title="S3 PDF" />
      ) : imageSrc ? (
        <iframe src={imageSrc} alt="Document" width="600" height="800"/>
      ) : (
        <p>Loading...</p>
      )}

        {!showBookingTable && currentDoc && (
          <form>
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  {currentDoc.df_B.map((_, idx) => (
                    <th
                      key={idx}
                      onClick={() =>
                        selectedColumn.includes(idx)
                          ? setSelectedColumn(selectedColumn.filter((col) => col !== idx))
                          : setSelectedColumn([...selectedColumn, idx])
                      }
                      style={{ backgroundColor: selectedColumn.includes(idx) ? '#27ae60' : 'transparent' }}
                    >
                      {`2B MATCH ${idx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {/* <span>Supplier-- </span>({currentDoc.df_A.seller_name}) */}
                      <span>Supplier</span>
                    </div>
                  </td>
                  {currentDoc.df_B.map((doc, idx) => (
                    <td key={idx} style={{ backgroundColor: selectedColumn.includes(idx) ? '#27ae60' : 'transparent' }}>
                      {doc.trdnm || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Supplier GSTIN-- </span>({currentDoc.df_A.seller_vat_number})
                    </div>
                  </td>
                  {currentDoc.df_B.map((doc, idx) => (
                    <td key={idx} style={{ backgroundColor: selectedColumn.includes(idx) ? '#27ae60' : 'transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {doc.ctin || 'N/A'}
                        <div style={{ backgroundColor: getColor(parseInt(doc.gstin_score)), color: 'white', padding: '4px 8px', borderRadius: '16px', display: 'inline-block' }}>
                          {parseInt(doc.gstin_score)}%
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Invoice Number-- </span>({currentDoc.df_A.invoice_number})
                    </div>
                  </td>
                  {currentDoc.df_B.map((doc, idx) => (
                    <td key={idx} style={{ backgroundColor: selectedColumn.includes(idx) ? '#27ae60' : 'transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {doc.inum || 'N/A'}
                        <div style={{ backgroundColor: getColor(parseInt(doc.inv_no_score)), color: 'white', padding: '4px 8px', borderRadius: '16px', display: 'inline-block' }}>
                          {parseInt(doc.inv_no_score)}%
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Invoice Value </span>({currentDoc.df_A.invoice_amount})
                    </div>
                  </td>
                  {currentDoc.df_B.map((doc, idx) => (
                    <td key={idx} style={{ backgroundColor: selectedColumn.includes(idx) ? '#27ae60' : 'transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {doc.val || 'N/A'}
                        <div style={{ backgroundColor: getColor(parseInt(doc.amount_score)), color: 'white', padding: '4px 8px', borderRadius: '16px', display: 'inline-block' }}>
                          {parseInt(doc.amount_score)}%
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Invoice Date </span>
                      ({formatTimestamp(currentDoc.df_A.invoice_date)})
                    </div>
                  </td>
                  {currentDoc.df_B.map((doc, idx) => (
                    <td key={idx} style={{ backgroundColor: selectedColumn.includes(idx) ? '#27ae60' : 'transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ marginRight: 'auto' }}>
                          {formatTimestamp(doc.dt) || 'N/A'}
                        </span>
                        <div style={{ backgroundColor: getColor(parseInt(doc.date_score)), color: 'white', padding: '4px 8px', borderRadius: '16px', marginLeft: '5px' }}>
                          {parseInt(doc.date_score)}%
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Total Match Score</strong></td>
                  {currentDoc.df_B.map((doc, idx) => (
                    <td key={idx} style={{ backgroundColor: selectedColumn.includes(idx) ? '#27ae60' : getColor(parseInt(doc.combined_score)) }}>
                      {doc.combined_score.toFixed(2) || 'N/A'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <button type="button" onClick={handlePrevious}>Previous</button>
            <button type="button" onClick={handleSkip}>SKIP</button>
            <Popconfirm
              title="Are you sure about this match?"
              okText="Yes"
              cancelText="No"
              onConfirm={handleYesClick}
              onCancel={handleNoClick}
              disabled={isNextDisabled} 
            >
              <button type="button"style={{ cursor: isNextDisabled ? 'not-allowed' : 'pointer' }} disabled={isNextDisabled}>Next</button>
            </Popconfirm>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;