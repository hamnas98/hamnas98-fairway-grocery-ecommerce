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

const loginPage = async (req , res) => {
    try {
        if(!req.session.user) {
            return res.render('login' ,{ message: "" })
        }else {
            res.redirect('/')
        }
    } catch (error) {
        res.redirect('/pageNotFound')
        
    } 
};

const userLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Email:", email, "Password:", password);

        const findUser = await User.findOne({ role: 'user', email: email });
        console.log("User Found:", findUser);

        if (!findUser) {
            return res.render('login', { message: "User not found" });
        }

        if (findUser.isBlocked) {
            return res.render('login', { message: "User is blocked by admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        console.log("Password Match:", passwordMatch);

        if (!passwordMatch) {
            return res.render('login', { message: "Invalid password" });
        }

        // Store user session
        req.session.user = findUser._id;
        console.log("Session User ID:", req.session.user);

        // Redirect to the home page
        return res.redirect('/');
    } catch (error) {
        console.error("Login error:", error);
        return res.render('login', { message: "Login failed, please try again later" });
    }
};
const homePage = async (req, res) => {
    try {
        const user = req.session.user;
        if (user) {
            const userData = await User.findOne({ _id: user });
            
            // Ensure that user data is passed with the correct name
            res.render('home', { user: userData });  // Correctly passing user data as 'user'
        } else {
            res.render('home', { user: null });  // Ensuring user is passed as null if not logged in
        }
    } catch (error) {
        res.status(500).json({ message: 'Error loading home page', error });
        console.log('home page error');
    }
};

const userLogout = async (req,res) => {
    try {
        req.session.destroy((err) => {
            if(err) {
                console.log('session destruction error',err.message);
                return res.redirect('/pageNotFound')
            }
            return res.redirect('/login');
        })
    } catch (error) {
        console.log('logout errror');
        res.redirect('/pageNotFound');
        
    } 
};

const sendResetOTP = async (req, res) => {
    try {
        const { email } = req.body;
        console.log(email)

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('forgot-password', { message: "Email not registered" });
        }

        // Generate and send OTP
        const otp = await generateOTP();
        const emailSent = await sendOTP(email, otp);

        if (!emailSent) {
            return res.status(500).json({ success: false, message: "Failed to send OTP" });
        }

        // Save OTP in session
        req.session.resetOTP = otp;
        req.session.resetEmail = email;

        console.log('Reset OTP:', otp);
        return res.render('verify-reset-otp', { message: "" });
    } catch (error) {
        console.error("Error sending reset OTP:", error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const verifyResetOTP = async (req, res) => {
    try {
        const { otp } = req.body;

        // Check if OTP exists in the session
        if (!req.session.resetOTP) {
            return res.status(400).json({
                success: false,
                message: "Session expired. Please request a new OTP.",
            });
        }

        // Validate OTP
        if (String(otp).trim() !== String(req.session.resetOTP).trim()) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again.",
            });
        }

        // OTP verified, proceed to password reset
        console.log('OTP verified successfully for:', req.session.resetEmail);

        // Respond with a success message and redirect URL
        return res.status(200).json({
            success: true,
            message: "OTP verified successfully.",
            redirectUrl: '/update-password', // URL to redirect after successful OTP verification
        });
    } catch (error) {
        console.error("Error verifying reset OTP:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later.",
        });
    }
};


const updatePassword = async (req, res) => {
    console.log(req.session.resetEmail);
    try {
        const { password, confirmPassword } = req.body;
        console.log(req.session.resetEmail,)

        // Validate session email
        if (!req.session.resetEmail) {
            console.log(req.session.resetEmail);
            
            return res.render('update-password', {
                email: req.session.resetEmail,
                message: "Session expired. Please restart the process."
            });
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.render('update-password', {
                email: req.session.resetEmail,
                message: "Passwords do not match. Please try again."
            });
        }

        // Hash the new password
        const hashedPassword = await HashPassword(password);

        const email = req.session.resetEmail

        // Update user's password in the database
        const result = await User.updateOne({ email }, { password: hashedPassword });

        if (result.modifiedCount === 0) {
            return res.render('update-password', {
                email: req.session.resetEmail,
                message: "Failed to update password. Please try again."
            });
        }

        console.log('Password updated for:', email);

        // Clear session data
        req.session.resetOTP = null;
        req.session.resetEmail = null;

        // Redirect to login
        return res.redirect('/login');
    } catch (error) {
        console.error("Error updating password:", error.message);
        return res.status(500).render('update-password', {
            email: req.session.resetEmail,
            message: "Internal server error. Please try again later."
        });
    }
};




module.exports = { userSignup , VerifyOTP, resendOTP, loginPage , userLogin ,homePage ,userLogout ,sendResetOTP,verifyResetOTP, updatePassword} ;