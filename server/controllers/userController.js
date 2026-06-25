const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const {getDB}=require('../config/db');
const {sendVerificationEmail,sendEmail}=require('../services/sendermail');


const registerUser=async(req,res)=>{
    try{
        const {name,email,password,role,phone_number}=req.body;

        if(!name || !email || !password){
            return res.status(400).json({message:'Name, email, and password are required'});
        }

        if(!process.env.JWT_SECRET){
            throw new Error('JWT_SECRET environment variable is required');
        }

        const db=getDB();
        const normalizedEmail=email.toLowerCase();
        const existingUser=await db.collection('users').findOne({email: normalizedEmail});
        if(existingUser){
            return res.status(400).json({message:'User already exists'});
        }

        const hashedPassword=await bcrypt.hash(password,10);
        const result=await db.collection('users').insertOne({
            name,
            email: normalizedEmail,
            phone_number: phone_number || "",
            password:hashedPassword,
            role: role || 'user',
            isVerified: false,
            createdAt: new Date()
        });

        const token=jwt.sign(
            {
                userId: result.insertedId,
                email: normalizedEmail
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1d'
            }
        );

        let emailSent = true;
        try {
            await sendVerificationEmail(normalizedEmail, name, token);
        } catch (emailError) {
            emailSent = false;
            console.error('EMAIL SEND ERROR:', emailError);
        }

        res.status(201).json({
            message: emailSent
                ? 'User registered successfully. Please check your email to verify your account.'
                : 'User registered successfully, but verification email could not be sent. Please contact support.',
        });
    }
    catch(error){
        console.error('REGISTER ERROR:', error);
        res.status(500).json({
            message:'Server Error',
            error: error.message
        });
    }
};



const generateAccessToken=(user)=>{
    return jwt.sign(
        {id: user._id,
         email: user.email,
         role: user.role},
         process.env.ACCESS_TOKEN_SECRET || 'access_secret_key',
         {expiresIn:'15m'}
    );
};
const generateRefreshToken=(user)=>{
    return jwt.sign(
        {id: user._id,
         email: user.email,
         role: user.role},
         process.env.REFRESH_TOKEN_SECRET || 'refresh_secret_key',
         {expiresIn:'7d'}
    );
};

const loginUser=async(req,res)=>{
    try{
        const {email,password}=req.body;
        const db=getDB();
        const user=await db.collection('users').findOne({email: email.toLowerCase()});
        if(!user){
            return res.status(400).json({message:'Invalid email'});
        }
        if(!user.isVerified){
            return res.status(401).json({message:'Email not verified. Please check your email for verification link.'});
        }
        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(401).json({message:'Invalid password'});
        }
        const accessToken=generateAccessToken(user);
        const refreshToken=generateRefreshToken(user);
        await db.collection('users').updateOne(
            {_id: user._id},
            {$set: {refresh_token: refreshToken}}
        );
        res.status(200).json({
            message:'Login successful',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                name: user.name, 
                email: user.email,
                role: user.role
            }
        });
    }  catch(error){
        res.status(500).json({
            message:'Login failed',
            error: error.message
        });
    }
};

const refreshUserToken=async(req,res)=>{
    try{
        const {refreshToken}=req.body;
        if(!refreshToken){
            return res.status(401).json({message:'Refresh token is required'});
        }
        let decoded;
        try{
            decoded=jwt.verify(refreshToken,"refresh_secret_key");
        }catch(error){
            return res.status(403).json({message:'Invalid refresh token'});
        }
    
    const db=getDB();
    const user=await db.collection('users').findOne({email: decoded.email,refresh_token: refreshToken});
    if (!user){
        return res.status(403).json({message:'Invalid refresh token'});
    }
    const newAccessToken=generateAccessToken(user);
    const newRefreshToken=generateRefreshToken(user);
    await db.collection('users').updateOne(
        {_id: user._id},
        {$set: {refresh_token: newRefreshToken}}
    );
    res.status(200).json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    });
}
catch (error){
    res.status(500).json({
        message: "Server error during refresh",
        error: error.message
    });
}

};


const sendPasswordResetEmail=async(req,res)=>{
    try{
        const {email}=req.body;
        if(!email){
            return res.status(400).json({message:'Email is required'});
        }

        const db=getDB();
        const userCollection=db.collection('users');

        const normalizedEmail=email.toLowerCase();
        const user=await userCollection.findOne({email: normalizedEmail});
        if(!user){
            return res.status(404).json({message:'User not found'});
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        console.log(`forgot password requested for ${normalizedEmail}. Generate OTP: ${otp}`);
        await userCollection.updateOne(
            {_id : user._id},
            {
                $set: {
                    reset_password_otp: otpHash,
                    reset_password_otp_expires_at: expiresAt,
                    updated_At: new Date(),
                },
            }
        );

        const emailResult = await sendEmail({
            to: normalizedEmail,
            subject: 'ShopMATE Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}. It will expire in 15 minutes.`,
            html: `<p>Your OTP for password reset is: <strong>${otp}</strong>. It will expire in 15 minutes.</p>`,
        });
        console.log(`Forgot password email sent:`, emailResult && emialResult.response);


        return res.status(200).json({message:'Password reset OTP sent to email'});
    }catch(error){
        console.error(`Forgot password error:`, error);
        return res.status(500).json({message:'Could not send otp', error: error.message});
    }
};
    

        


module.exports={
    registerUser,
    loginUser,
    refreshUserToken
};
