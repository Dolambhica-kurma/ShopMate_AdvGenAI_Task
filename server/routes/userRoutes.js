const express=require('express');
const router=express.Router();
const {registerUser,loginUser,refreshUserToken}=require('../controllers/userController');
const verifyEmail=require("../services/verify");
router.post('/register', registerUser);
router.post('/refresh-token', refreshUserToken);
router.get('/verify-email/:token', verifyEmail);
router.post('/login', loginUser);
module.exports=router;


