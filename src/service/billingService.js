
const PDFDocument = require("pdfkit");
const fs = require("fs");
const Billing = require("../model/Bill")


exports.createBillService = async(data)=>{
    try {
        const newBill = new Billing(data);
        return await newBill.save();
    } catch (error) {
        throw new Error(`Error creating bill: ${error.message}`);
    }
}

exports.getBillService = async(sellerId)=>{
    try {
        return await Billing.find({sellerId}).sort({createdAt:-1});
    } catch (error) {
        throw new Error(`Error getting bill: ${error.message}`);
    }
}



exports.generatePDFService = async (sellerId, bills, res) => {
  try {
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers for downloading the PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="billing-report-${sellerId}.pdf"`);

    // Pipe the PDF stream directly to the response
    doc.pipe(res);

    // Title Section
    doc
      .fontSize(20)
      .text("Billing Report", { align: "center", underline: true })
      .moveDown();

    // Seller ID Section
    doc.fontSize(12).text(`Seller ID: ${sellerId}`, { align: "left" }).moveDown(1);

    // Table Header with Background
    const tableHeaderY = doc.y;
    doc
      .fillAndStroke("#F0F0F0", "#000"); // Light gray fill with black border
    doc
      .fontSize(12)
      .fillColor("#000")
      .text("Bill #", 30, tableHeaderY, { continued: true })
      .text("Amount", 70, tableHeaderY, { continued: true })
      .text("Description", 120, tableHeaderY, { continued: true })
      .text("Status", 220, tableHeaderY, { continued: true })
      .text("Date", 300, tableHeaderY); // Status

    doc.moveDown(1.5);

    // Table Rows with Alternating Background Colors
    bills.forEach((bill, index) => {
    
      const isEvenRow = index % 2 === 0;
      const rowY = doc.y;

      // Add background color for even rows
      if (isEvenRow) {
        doc.rect(50, rowY - 2, 500, 20).fill("#F9F9F9").stroke(); // Light gray for even rows
      }

      doc
        .fontSize(11)
        .fillColor("#000") // Reset text color to black
        .text(`${index + 1}`, 30, rowY, { continued: true }) // Bill #
        .text(`$${bill.amount.toFixed(2)}`, 70, rowY, { continued: true }) 
        .text(`${bill.description || "N/A"}`, 120, rowY, { continued: true }) 
        .text(`${bill.status}`, 220, rowY,{ continued: true }) // Status
        .text(`${bill.createdAt}`, 300, rowY); // Status
         
      doc.moveDown(1);
    });

    // Footer Section
    doc
      .moveDown(2)
      .fontSize(10)
      .fillColor("gray")
      .text("This report is generated automatically. For any inquiries, contact support.", {
        align: "center",
      });

    // Finalize the PDF and end the stream
    doc.end();
  } catch (error) {
    throw new Error(`Error generating PDF: ${error.message}`);
  }
};


