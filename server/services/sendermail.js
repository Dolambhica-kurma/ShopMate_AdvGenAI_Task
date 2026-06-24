const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_SERVER || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === 'true',
    requireTLS: process.env.MAIL_SECURE !== 'true',
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.error('EMAIL TRANSPORT VERIFICATION FAILED:', error.message);
    } else {
        console.log('EMAIL TRANSPORT VERIFIED');
    }
});

const sendVerificationEmail = async (email,name,token) => {
   const verifyLink =
  `http://localhost:3001/api/users/verify-email/${token}`;
    await transporter.sendMail({
        from: `"ShopMate" <${process.env.MAIL_USERNAME}>`,
        to: email,
        subject: "Verify Your Email",
        html: `
            <h2>Hello ${name},</h2>
            <p>Please verify your email to activate your ShopMate account.</p>
            <a href="${verifyLink}">Click here to verify</a>
        `
    });
};
const sendEmail = async ({to, subject,text, html}) => {
    await transporter.sendMail({
        from: `"ShopMate" <${process.env.MAIL_USERNAME}>`,
        to,
        subject,
        text,
        html
    });
};
module.exports={
    sendEmail,
    sendVerificationEmail
};
