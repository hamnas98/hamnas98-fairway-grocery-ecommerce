const Order = require('../../models/Order');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, range } = getDateRange(req.query);
        
        const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate },
            orderStatus: { $nin: ['Cancelled'] }
        }).populate('items.product');

        const report = calculateReport(orders);

        res.render('sales-report', {
            report,
            startDate,
            endDate,
            path:'admin/sales-report'
        });
    } catch (error) {
        console.error('Sales report error:', error);
        res.redirect('/admin/dashboard');
    }
};

const getDateRange = (query) => {
    let endDate = new Date();
    let startDate = new Date();
    const range = query.range || 'day';

    switch (range) {
        case 'week':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case 'month':
            startDate.setDate(endDate.getDate() - 30);
            break;
        case 'custom':
            startDate = new Date(query.startDate);
            endDate = new Date(query.endDate);
            endDate.setHours(23, 59, 59, 999);
            break;
        default: // day
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate, range };
};

const calculateReport = (orders) => {
    let totalAmount = 0;
    let discountAmount = 0;
    let couponDiscount = 0;
    let netAmount = 0;

    orders.forEach(order => {
        totalAmount += order.total;
        discountAmount += (order.total - order.discountTotal);
        couponDiscount += order.couponDiscount || 0;
        netAmount += order.discountTotal;
    });

    return {
        orders,
        totalOrders: orders.length,
        totalAmount,
        discountAmount,
        couponDiscount,
        netAmount
    };
};

const downloadReport = async (req, res) => {
    try {
        const { startDate, endDate } = getDateRange(req.query);
        const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate },
            orderStatus: { $nin: ['Cancelled'] }
        }).populate('items.product');

        const report = calculateReport(orders);
        const format = req.query.format;

        if (format === 'excel') {
            await generateExcel(res, report, startDate, endDate);
        } else {
            await generatePDF(res, report, startDate, endDate);
        }
    } catch (error) {
        console.error('Download report error:', error);
        res.status(500).send('Failed to generate report');
    }
};

async function generateExcel(res, report, startDate, endDate) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');
 
    // Headers
    worksheet.addRow(['Sales Report']);
    worksheet.addRow([`${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`]);
    worksheet.addRow([]);
 
    // Summary
    worksheet.addRow(['Summary']);
    worksheet.addRow(['Total Orders', report.totalOrders]);
    worksheet.addRow(['Total Amount', report.totalAmount.toFixed(2)]);
    worksheet.addRow(['Discount Amount', report.discountAmount.toFixed(2)]);
    worksheet.addRow(['Coupon Discount', report.couponDiscount.toFixed(2)]);
    worksheet.addRow(['Net Amount', report.netAmount.toFixed(2)]);
    worksheet.addRow([]);
 
    // Orders table
    worksheet.addRow([
        'Order ID',
        'Date',
        'Items',
        'Amount',
        'Discount',
        'Coupon',
        'Net Amount',
        'Status'
    ]);
 
    report.orders.forEach(order => {
        worksheet.addRow([
            order._id.toString().slice(-6),
            new Date(order.createdAt).toLocaleString(),
            order.items.length,
            order.total.toFixed(2),
            (order.total - order.discountTotal).toFixed(2),
            (order.couponDiscount || 0).toFixed(2),
            order.discountTotal.toFixed(2),
            order.orderStatus
        ]);
    });
 
    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
        'Content-Disposition',
        `attachment; filename=sales-report-${startDate.toISOString().split('T')[0]}.xlsx`
    );
 
    await workbook.xlsx.write(res);
 }
 
 async function generatePDF(res, report, startDate, endDate) {
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
        'Content-Disposition', 
        `attachment; filename=sales-report-${startDate.toISOString().split('T')[0]}.pdf`
    );
 
    doc.pipe(res);
 
    // Header
    doc.fontSize(20).text('Sales Report', { align: 'center' });
    doc.fontSize(12).text(
        `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        { align: 'center' }
    );
    doc.moveDown();
 
    // Summary
    doc.fontSize(16).text('Summary');
    doc.fontSize(12);
    doc.text(`Total Orders: ${report.totalOrders}`);
    doc.text(`Total Amount: ₹${report.totalAmount.toFixed(2)}`);
    doc.text(`Discount Amount: ₹${report.discountAmount.toFixed(2)}`);
    doc.text(`Coupon Discount: ₹${report.couponDiscount.toFixed(2)}`);
    doc.text(`Net Amount: ₹${report.netAmount.toFixed(2)}`);
    doc.moveDown();
 
    // Orders table
    const tableTop = doc.y;
    const tableHeaders = [
        'Order ID', 'Date', 'Items', 'Amount', 
        'Discount', 'Coupon', 'Net Amount', 'Status'
    ];
 
    let currentY = tableTop;
    doc.font('Helvetica-Bold');
 
    tableHeaders.forEach((header, i) => {
        doc.text(header, 50 + (i * 70), currentY, { width: 60 });
    });
 
    doc.font('Helvetica');
    currentY += 20;
 
    report.orders.forEach(order => {
        if (currentY > 700) {
            doc.addPage();
            currentY = 50;
        }
 
        const row = [
            '#' + order._id.toString().slice(-6),
            new Date(order.createdAt).toLocaleDateString(),
            order.items.length,
            '₹' + order.total.toFixed(2),
            '₹' + (order.total - order.discountTotal).toFixed(2),
            '₹' + (order.couponDiscount || 0).toFixed(2),
            '₹' + order.discountTotal.toFixed(2),
            order.orderStatus
        ];
 
        row.forEach((text, i) => {
            doc.text(text.toString(), 50 + (i * 70), currentY, { width: 60 });
        });
 
        currentY += 20;
    });
 
    doc.end();
 }

module.exports = { getSalesReport, downloadReport };


