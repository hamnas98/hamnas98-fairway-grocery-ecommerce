const nodemailer = require('nodemailer');
const OTP = require('../models/User');

const generateOTP = async (req,res) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  return otp;
};

const sendOTP = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure:false,
            requireTLS: true,
            auth: {
              user: process.env.NODEMAILER_EMAIL,
              pass: process.env.NODEMAILER_PASSWORD,
            }
          });
          const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Your OTP for Fairway Grocery Signup',
            text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
          };

          await transporter.sendMail(mailOptions);
          return true
    } catch (error) {
        console.log('error sending maail')
        
    }
};

module.exports = { generateOTP, sendOTP };
