const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class InvoiceGenerator {
    constructor(order) {
        this.order = order;
    }

    generateHeader(doc) {
        doc
            .image(path.join(__dirname, '../public/user/images/fairway-logo.jpg'), 50, 45, { width: 50 })
            .fillColor('#444444')
            .fontSize(20)
            .text('Fairway Supermarket', 110, 57)
            .fontSize(10)
            .text('Kanakpura Road', 450, 50)
    }

    generateCustomerInformation(doc) {
        const customerInformationTop = 140;

        doc
            .fontSize(16)
            .text('INVOICE', 50, customerInformationTop)
            .fontSize(10)
            .text('Invoice Number:', 50, customerInformationTop + 30)
            .text(this.order._id.toString(), 150, customerInformationTop + 30)
            .text('Invoice Date:', 50, customerInformationTop + 45)
            .text(this.formatDate(new Date()), 150, customerInformationTop + 45)
            .text('Order Status:', 50, customerInformationTop + 60)
            .text(this.order.orderStatus, 150, customerInformationTop + 60)
            .font('Helvetica-Bold')
            .text('Shipping Address:', 350, customerInformationTop + 30)
            .font('Helvetica')
            .text(this.formatAddress(this.order.deliveryAddress), 350, customerInformationTop + 45);

        this.generateHr(doc, customerInformationTop + 85);
    }

    generateInvoiceTable(doc) {
        const tableTop = 270;
        
        // Table headers
        doc
            .font('Helvetica-Bold')
            .fontSize(10);

        this.generateTableRow(
            doc,
            tableTop,
            ['Item', 'Quantity', 'Unit Price', 'Discount', 'Line Total'],
            [180, 70, 80, 80, 80] // Column widths
        );

        this.generateHr(doc, tableTop + 20);
        doc.font('Helvetica');

        let position = tableTop + 30;

        // Table content
        for (const item of this.order.items) {
            const lineTotal = (item.discountPrice || item.price) * item.quantity;
            const discount = item.price - (item.discountPrice || item.price);

            position = this.generateTableRow(
                doc,
                position,
                [
                    item.product.name,
                    item.quantity.toString(),
                    `₹${item.price.toFixed(2)}`,
                    `₹${discount.toFixed(2)}`,
                    `₹${lineTotal.toFixed(2)}`
                ],
                [180, 70, 80, 80, 80] // Column widths
            );

            this.generateHr(doc, position + 10);
            position += 20;
        }

        // Totals
        const totalsPosition = position + 30;
        const rightColumnX = 400;
        const rightColumnWidth = 150;

        doc
            .font('Helvetica')
            .fontSize(10)
            .text('Subtotal:', rightColumnX, totalsPosition)
            .text(`₹${this.order.total.toFixed(2)}`, rightColumnX, totalsPosition, {
                width: rightColumnWidth,
                align: 'right'
            });

        let currentPosition = totalsPosition;

        if (this.order.couponDiscount > 0) {
            currentPosition += 20;
            doc
                .text('Coupon Discount:', rightColumnX, currentPosition)
                .text(`-₹${this.order.couponDiscount.toFixed(2)}`, rightColumnX, currentPosition, {
                    width: rightColumnWidth,
                    align: 'right'
                });
        }

        if (this.order.walletAmount > 0) {
            currentPosition += 20;
            doc
                .text('Wallet Amount:', rightColumnX, currentPosition)
                .text(`-₹${this.order.walletAmount.toFixed(2)}`, rightColumnX, currentPosition, {
                    width: rightColumnWidth,
                    align: 'right'
                });
        }

        currentPosition += 25;
        doc
            .font('Helvetica-Bold')
            .text('Total:', rightColumnX, currentPosition)
            .text(`₹${this.order.discountTotal.toFixed(2)}`, rightColumnX, currentPosition, {
                width: rightColumnWidth,
                align: 'right'
            });
    }

    generateTableRow(doc, y, items, widths) {
        let x = 50;
        
        items.forEach((item, i) => {
            doc.text(item, x, y, {
                width: widths[i],
                align: i === 0 ? 'left' : 'right'
            });
            x += widths[i] + 10;
        });

        return y + 20;
    }

    generateFooter(doc) {
        doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(
                'Payment received via ' + this.formatPaymentMethod(this.order.paymentMethod),
                50,
                700,
                { align: 'center' }
            );
    }

    formatPaymentMethod(method) {
        const methods = {
            'cod': 'Cash on Delivery',
            'razorpay': 'Online Payment',
            'wallet': 'Wallet',
            'wallet_razorpay': 'Wallet + Online Payment',
            'wallet_cod': 'Wallet + Cash on Delivery'
        };
        return methods[method] || method.toUpperCase();
    }

    generateHr(doc, y) {
        doc
            .strokeColor('#AAAAAA')
            .lineWidth(1)
            .moveTo(50, y)
            .lineTo(550, y)
            .stroke();
    }

    formatDate(date) {
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric'
        });
    }

    formatAddress(address) {
        const lines = [
            address.name,
            address.flat,
            address.addressLine,
            address.city,
            `${address.state} - ${address.pincode}`
        ];
        return lines.filter(Boolean).join('\n');
    }

    async generate() {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: `Invoice-${this.order._id}`,
                Author: 'Fairway Supermarket'
            }
        });
        
        this.generateHeader(doc);
        this.generateCustomerInformation(doc);
        this.generateInvoiceTable(doc);
        this.generateFooter(doc);

        return new Promise((resolve, reject) => {
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            doc.end();
        });
    }
}

module.exports = InvoiceGenerator;