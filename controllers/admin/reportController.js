const Order = require('../../models/Order');
const PDFDocument = require('pdfkit');
const excel = require('exceljs');

const getSalesReport = async (req, res) => {
    try {
        const { range, startDate, endDate } = req.query;
        
        let dateQuery = {};
        const now = new Date();

        switch(range) {
            case 'day':
                dateQuery = {
                    createdAt: {
                        $gte: new Date(now.setHours(0,0,0,0)),
                        $lt: new Date(now.setHours(23,59,59,999))
                    }
                };
                break;
            case 'week':
                const weekStart = new Date(now.setDate(now.getDate() - 7));
                dateQuery = {
                    createdAt: { $gte: weekStart, $lt: new Date() }
                };
                break;
            case 'month':
                const monthStart = new Date(now.setMonth(now.getMonth() - 1));
                dateQuery = {
                    createdAt: { $gte: monthStart, $lt: new Date() }
                };
                break;
            case 'custom':
                dateQuery = {
                    createdAt: {
                        $gte: new Date(startDate),
                        $lt: new Date(endDate)
                    }
                };
                break;
        }

        const orders = await Order.find({
            ...dateQuery,
            orderStatus: { $nin: ['Cancelled', 'Return Completed'] }
        }).populate('items.product coupon');

        const report = generateReport(orders);

        if (req.query.download === 'pdf') {
            return generatePDF(res, report);
        }
        if (req.query.download === 'excel') {
            return generateExcel(res, report);
        }

        res.render('sales-report', {
            report,
            startDate: dateQuery.createdAt?.$gte,
            endDate: dateQuery.createdAt?.$lt,
            path:'admin/sales-report'
        });

    } catch (error) {
        console.error('Sales report error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
};

function generateReport(orders) {
    return {
        totalOrders: orders.length,
        totalAmount: orders.reduce((sum, order) => sum + order.total, 0),
        discountAmount: orders.reduce((sum, order) => 
            sum + (order.total - order.discountTotal), 0),
        couponDiscount: orders.reduce((sum, order) => 
            sum + (order.couponDiscount || 0), 0),
        netAmount: orders.reduce((sum, order) => sum + order.discountTotal, 0),
        orders: orders
    };
}
function generatePDF(res, report) {
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
    
    doc.pipe(res);
    
    // Add content to PDF
    doc.fontSize(20).text('Sales Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Total Orders: ${report.totalOrders}`);
    doc.text(`Total Amount: ₹${report.totalAmount.toFixed(2)}`);
    doc.text(`Discount Amount: ₹${report.discountAmount.toFixed(2)}`);
    doc.text(`Coupon Discount: ₹${report.couponDiscount.toFixed(2)}`);
    doc.text(`Net Amount: ₹${report.netAmount.toFixed(2)}`);
    
    doc.end();
}

function generateExcel(res, report) {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');
    
    worksheet.columns = [
        { header: 'Order ID', key: 'orderId' },
        { header: 'Date', key: 'date' },
        { header: 'Amount', key: 'amount' },
        { header: 'Discount', key: 'discount' },
        { header: 'Coupon', key: 'coupon' },
        { header: 'Net Amount', key: 'netAmount' }
    ];
    
    report.orders.forEach(order => {
        worksheet.addRow({
            orderId: order._id,
            date: order.createdAt.toLocaleDateString(),
            amount: order.total,
            discount: order.total - order.discountTotal,
            coupon: order.couponDiscount || 0,
            netAmount: order.discountTotal
        });
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
    
    return workbook.xlsx.write(res);
}


module.exports = { getSalesReport }