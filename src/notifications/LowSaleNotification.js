const Notification = require("../model/Notification");
const SaleStock = require("../model/SaleStock")
const nodemailer = require("nodemailer");

/*
exports.checkLowSalesNotificatios = async(req,res)=>{
    try {
        const products = await SaleStock.find();
        const newNotifications  = [];

        for(const product of products){
            const productStock = (product.fulfillableQuantity || 0)+ (product.pendingTransshipmentQuantity || 0)+ (product.quantity || 0);

            const sales30D = product.salesMetrics.find((metric)=> metric.time === "30 D");

            const totalUnitSold = sales30D ? sales30D.totalUnits :0;

            if(totalUnitSold < productStock){
                const existingNotification = await Notification.findOne({
                    asin:product.asin1,
                    sku:product.sellerSku,
                    stock:productStock,
                    sales30Days: totalUnitSold
                })
           

            if(!existingNotification){
                const message = `Low sales in last 30 days for ASIN: ${product.asin1}, SKU: ${product.sellerSku}. Current Stock: ${productStock}, Sales: ${totalUnitSold}`;

                const notification = new Notification({
                    asin:product.asin1,
                    sku:product.sellerSku,
                    stock:productStock,
                    sales30Days: totalUnitSold,
                    message
                })
                await notification.save();
                newNotifications.push(notification);
            }
        }
    }

    if(newNotifications.length > 0){
        sendNotificationEmail(newNotifications);
    }

    res.status(200).json({
        status:"Success",
        message:"Notifications checked and stored succeessfully",
        newNotifications
    })

    } catch (error) {
        res.status(500).json({
            status:"Failed",
            message: "Error while generating notifications",
            error:error.message
            })
    }
};
*/
exports.checkLowSalesNotifications = async (req, res) => {
    try {
      const products = await SaleStock.find();
      const newNotifications = [];
  
      for (const product of products) {
        const asin = product.asin1 || "N/A";
        const sku = product.sellerSku || "N/A";
        const stock =
          (product.fulfillableQuantity || 0) +
          (product.pendingTransshipmentQuantity || 0) +
          (product.quantity || 0);
  
        // Check sales for the "30 D" time period
        const sales30D = product.salesMetrics?.find((metric) => metric.time === "30 D");
        const totalUnitsSold = sales30D ? sales30D.totalUnits : 0;
  
        console.log(`ASIN: ${asin}, SKU: ${sku}, Stock: ${stock}, Sales (30 Days): ${totalUnitsSold}`);
  
        // Condition: Sales < Stock
        if (totalUnitsSold < stock) {
          const existingNotification = await Notification.findOne({
            title: `Low Sales for ${sku}`,
            "data.asin": asin,
            "data.sku": sku,
          });
  
          if (!existingNotification) {
            const notification = new Notification({
              title: `Low Sales for ${asin}`,
              message: `Sales for last 30 days (${totalUnitsSold}) are less than stock (${stock}).`,
              type: "sale",
              data: {
                asin,
                sku,
                stock,
                sales: totalUnitsSold,
              },
            });
  
            await notification.save();
            newNotifications.push({
              asin,
              sku,
              stock,
              sales: totalUnitsSold,
            });
          }
        }
      }
  
      if (newNotifications.length > 0) {
        sendNotificationEmail(newNotifications); // Send email with clean table format
      }
  
      res.status(200).json({
        status: "Success",
        message: "Notifications checked and stored.",
        newNotifications,
      });
    } catch (error) {
      console.error("Error generating notifications:", error.message);
      res.status(500).json({
        status: "Failed",
        message: "Error while generating notifications.",
        error: error.message,
      });
    }
  };
  
  const sendNotificationEmail = async (notifications) => {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "office@brecx.com",
        pass: "mred dywd kbix wkuq",
      },
    });
  
    // Generate the table rows dynamically
    const tableRows = notifications
      .map(
        (note) => `
          <tr>
            <td style="padding: 8px; text-align: center;">${note.asin}</td>
            <td style="padding: 8px; text-align: center;">${note.sku}</td>
            <td style="padding: 8px; text-align: center;">${note.stock}</td>
            <td style="padding: 8px; text-align: center;">${note.sales}</td>
          </tr>
        `
      )
      .join("");
  
    const emailBody = `
      <h3>Low Sales Notifications</h3>
      <table border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 14px;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; text-align: center;">ASIN</th>
            <th style="padding: 10px; text-align: center;">SKU</th>
            <th style="padding: 10px; text-align: center;">Stock</th>
            <th style="padding: 10px; text-align: center;">Sales (30 Days)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
  
    const mailOptions = {
      from: '"Notification Service" <office@brecx.com>',
      to: "pm@brecx.com, bb@brecx.com",
      subject: "Low Sales Notifications",
      html: emailBody,
    };
  
    try {
      await transporter.sendMail(mailOptions);
      console.log("Notification email sent successfully!");
    } catch (error) {
      console.error("Failed to send notification email:", error.message);
    }
  };
  
/*  
const sendNotificationEmail = async(notifications)=>{
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'office@brecx.com', 
        pass: 'mred dywd kbix wkuq',  
      },
    });

    const emailBody = notifications
    .map(
        (note)=>
        `<li${note.message}</li>`
    )
    .join("");

    const mailOptions ={
        from:'"Notification Service" <office@brecx.com>',
        to:"bb@brecx.com",
        subject:"Low sales notifications",
        html:`<h3>Low Sales Notifications</h3><ul>${emailBody}</h3>`
    }
    await transporter.sendMail(mailOptions);
}

*/