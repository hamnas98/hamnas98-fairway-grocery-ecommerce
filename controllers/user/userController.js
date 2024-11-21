const bcrypt = require('bcrypt');

const User = require('../../models/User');
const { generateOTP, sendOTP  } = require('../../utils/otpUtils');


const userSignup = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        console.log('name',name)

        // Check if email exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('Email already registered:', email);
            return res.render('signup', {
                errors: [{ msg: 'Email is already registered', param: 'email' }],
                oldInput: req.body,
            });
        }
        const otp = await generateOTP();

        const emailSent = await sendOTP(email,otp);
        if(!emailSent){
            console.log('error sending otp');
            return res.json('email-error')
        }
        req.session.UserOTP=otp;
        req.session.UserData = {name,email,phone,password};

        res.render('verify-otp');
        console.log('otp' ,otp)

    } catch (err) {
        console.error('Error during signup:', err.message);
        return res.status(500).render('error', { message: 'Internal server error' });
    }
};

const HashPassword = async (password) => {
    try {
        const paswordHash = await bcrypt.hash(password,10);
        return paswordHash
    } catch (error) {
        
    }
}


const VerifyOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("Submitted OTP:", otp);
        console.log("Session OTP:", req.session.UserOTP);

        // Check if session OTP exists
        if (!req.session.UserOTP) {
            console.error("Session OTP not found or expired.");
            return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
        }

        // Normalize and compare OTPs
        if (String(otp).trim() === String(req.session.UserOTP).trim()) {
            const user = req.session.UserData;
            const hashedPassword = await HashPassword(user.password);

            const newUser = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: hashedPassword,
            });

            await newUser.save();
            req.session.User = newUser._id;

            console.log('User successfully verified and saved.');
            // Return a JSON response with the redirect URL
            return res.status(200).json({ success: true, redirectUrl: "/" });
        } else {
            console.error('Invalid OTP');
            return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
const resendOTP = async (req,res) => {
    try {
        const {email} = req.session.UserData;
        if(!email) {
            return res.staus(400).json({success :false, messege:"Email not found in session"});
        }
        const otp = await generateOTP();
        req.session.UserOTP = otp;

        const emailSent = await sendOTP(email,otp);

        if(emailSent) {
            console.log("resend otp:",otp);
            res.status(200).json({success :true, messege:"Otp resend Successfully"});
        }else{
            res.status(500).json({success :false, messege:"Failed to Resend Otp . please try again"});
        }
        

    } catch (error) {
        console.log("error sending otp",error);
        res.status(500).json({success:false,messege:"Internal server error"})
        
    }
}

module.exports = { userSignup , VerifyOTP, resendOTP };